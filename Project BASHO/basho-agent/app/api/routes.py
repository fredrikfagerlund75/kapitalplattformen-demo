"""
API Routes for Project BASHO
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas import (
    ValidatePOCRequest, ProductTypeRequest, DiscoveryRequest, ReviewRequest, GenerateMessageRequest,
    POCValidationResponse, SignalWeightResponse, DiscoveryResponse, FinalOutputResponse
)
from app.database import get_db
from app.modules.poc_validator import POCValidator
from app.modules.org_discovery import OrgDiscovery
from app.modules.email_discovery import EmailDiscovery
from app.modules.ranking_engine import RankingEngine
from app.modules.message_generator import ClaudeMessageGenerator
from app.signal_weights import get_default_weights, get_product_type_description
from app.models import Company, POCDiscovery
from datetime import datetime, timedelta
import json

router = APIRouter()

# Initialize modules
poc_validator = POCValidator()
org_discovery = OrgDiscovery()
email_discovery = EmailDiscovery()
message_generator = ClaudeMessageGenerator()

@router.post("/validate-poc", response_model=POCValidationResponse)
async def validate_poc(request: ValidatePOCRequest):
    """Validate anchor POC existence and gather initial information"""
    
    result = await poc_validator.validate_poc(
        poc_name=request.poc_name,
        company_name=request.company_name,
        additional_context=request.additional_context
    )
    
    return result

@router.get("/signal-weights/{product_type}", response_model=SignalWeightResponse)
async def get_signal_weights(product_type: str):
    """Get default signal weights for product type"""
    
    weights = get_default_weights(product_type)
    description = get_product_type_description(product_type)
    
    return SignalWeightResponse(
        product_type=product_type,
        default_weights=weights,
        description=description,
        can_adjust=True
    )

@router.post("/discover-and-rank", response_model=DiscoveryResponse)
async def discover_and_rank(request: DiscoveryRequest):
    """
    Main discovery endpoint - orchestrates org discovery, email discovery, and ranking
    """
    
    try:
        # Perform organization discovery
        org_data = await org_discovery.discover_org(
            request.company_name,
            request.anchor_poc_name,
            request.company_website
        )
        
        # Discover email patterns for POCs
        pocs_with_emails = []
        for poc in org_data.get("discovered_pocs", []):
            email_result = await email_discovery.discover_email(
                poc.get("name", ""),
                request.company_name
            )
            poc["email_info"] = email_result
            pocs_with_emails.append(poc)
        
        # Get signal weights (default + custom overrides)
        weights = get_default_weights(request.product_type)
        if request.custom_weights:
            weights.update(request.custom_weights)
        
        # Rank POCs
        ranking_engine = RankingEngine(weights)
        ranked_pocs = ranking_engine.rank_pocs(
            discovered_pocs=pocs_with_emails,
            email_info={poc.get("name"): poc.get("email_info", {}) for poc in pocs_with_emails},
            news_signals=org_data.get("news_signals", [])
        )
        
        cache_status = "fresh"
        
        # Prepare response with proper schema mapping
        from app.schemas import POCRankingItem, EmailPatternInfo
        
        ranked_poc_items = []
        
        # Add anchor POC first if provided (the original input POC)
        if request.anchor_poc_name and request.anchor_poc_name.lower() != "unknown":
            anchor_item = POCRankingItem(
                poc_name=request.anchor_poc_name,
                title="Original Input POC",
                company_name=request.company_name,
                email="",
                email_info=EmailPatternInfo(
                    email="",
                    pattern="user_provided",
                    confidence_percentage=1.0,
                    sources=["user_input"]
                ),
                title_authority_score=1.0,
                product_relevance_score=1.0,
                reporting_relevance_score=0.0,
                combined_confidence_score=1.0,
                score_breakdown={
                    "title_authority": 1.0,
                    "product_relevance_weight": 1.0,
                    "reporting_relevance": 0.0,
                    "role_component_50pct": 0.5,
                    "email_confidence": 1.0,
                    "email_component_50pct": 0.5,
                    "final_combined_score": 1.0,
                },
                public_signals=[f"User-provided anchor POC for {request.company_name}"],
                is_anchor=True,
                rank=0  # Will be updated below
            )
            ranked_poc_items.append(anchor_item)
        
        # Add discovered POCs
        for i, poc in enumerate(ranked_pocs):
            email_info_obj = EmailPatternInfo(
                email=poc.get("email", "unknown@example.com"),
                pattern=poc.get("email_info", {}).get("pattern", "unknown"),
                confidence_percentage=poc.get("email_confidence_score", 0),
                sources=poc.get("email_info", {}).get("sources", [])
            )
            
            item = POCRankingItem(
                poc_name=poc.get("poc_name", "Unknown"),
                title=poc.get("title", "Unknown"),
                company_name=request.company_name,
                email=poc.get("email", "unknown@example.com"),
                email_info=email_info_obj,
                title_authority_score=poc.get("title_authority_score", 0),
                product_relevance_score=poc.get("product_relevance_score", 0),
                reporting_relevance_score=poc.get("reporting_relevance_score", 0),
                combined_confidence_score=poc.get("combined_confidence_score", 0),
                score_breakdown=poc.get("score_breakdown", {}),
                public_signals=poc.get("public_signals", []),
                is_anchor=False,
                rank=i + 1 + (1 if request.anchor_poc_name and request.anchor_poc_name.lower() != "unknown" else 0)
            )
            ranked_poc_items.append(item)
        
        # Update anchor rank to 1 if it exists
        if ranked_poc_items and ranked_poc_items[0].is_anchor:
            ranked_poc_items[0].rank = 1
        
        return DiscoveryResponse(
            company_name=request.company_name,
            total_pocs_discovered=len(ranked_poc_items),
            ranked_pocs=ranked_poc_items,
            discovery_timestamp=datetime.utcnow(),
            cache_status=cache_status,
            messages_ready=False,
            validation_warning=org_data.get("validation_warning"),
            using_inferred_data=org_data.get("using_inferred_data", False)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discovery error: {str(e)}")

@router.post("/generate-message")
async def generate_message(request: GenerateMessageRequest):
    """Generate personalized outreach message for a single POC"""
    
    try:
        message = await message_generator.generate_outreach_message(
            poc_name=request.poc_name,
            poc_title=request.poc_title,
            company_name=request.company_name,
            your_company=request.your_company,
            product_type=request.product_type,
            public_signals=request.public_signals or [],
            discovered_personal_info=request.discovered_personal_info
        )
        
        return message
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Message generation error: {str(e)}")

@router.post("/review-and-finalize", response_model=FinalOutputResponse)
async def review_and_finalize(request: ReviewRequest):
    """Final step - user review and adjustments before output"""
    
    try:
        # Process user adjustments
        # Reorder POCs
        # Adjust messages
        # Prepare final output
        
        return FinalOutputResponse(
            company_name="",
            ranked_pocs=[],
            messages=[],
            ready_to_send=True,
            export_format="json"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Finalization error: {str(e)}")
