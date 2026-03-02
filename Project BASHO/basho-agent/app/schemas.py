from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Input models
class ValidatePOCRequest(BaseModel):
    """Validate and get context for anchor POC"""
    poc_name: str
    company_name: str
    additional_context: Optional[str] = None  # Email or LinkedIn URL for weak validation

class ProductTypeRequest(BaseModel):
    """Product type and category for weighting"""
    product_type: str  # video_platform, hr_tool, analytics, etc.
    custom_weights: Optional[Dict[str, float]] = None  # User overrides

class DiscoveryRequest(BaseModel):
    """Request to discover and rank POCs"""
    anchor_poc_name: str
    company_name: str
    product_type: str
    company_website: Optional[str] = None  # e.g., "https://example.se" or "example.se"
    custom_weights: Optional[Dict[str, float]] = None

class ReviewRequest(BaseModel):
    """User review and adjustments before final output"""
    poc_rankings: List[Dict[str, Any]]  # Reordered/edited rankings
    message_adjustments: Dict[str, str]  # POC name -> adjusted message
    tone_preference: Optional[str] = None  # personal, neutral, formal

class GenerateMessageRequest(BaseModel):
    """Request to generate message for a POC"""
    poc_name: str
    poc_title: str
    company_name: str
    your_company: str
    product_type: str
    public_signals: Optional[List[str]] = None
    discovered_personal_info: Optional[Dict[str, Any]] = None

# Output models
class POCValidationResponse(BaseModel):
    """Response to POC validation"""
    is_valid: bool
    confidence: float
    found_info: Dict[str, Any]
    needs_clarification: bool
    clarification_request: Optional[str] = None

class SignalWeightResponse(BaseModel):
    """Signal weights for product type"""
    product_type: str
    default_weights: Dict[str, float]
    description: str
    can_adjust: bool = True

class EmailPatternInfo(BaseModel):
    """Email discovery info"""
    email: str
    pattern: str
    confidence_percentage: float
    sources: List[str]  # Which sources verified this pattern

class POCRankingItem(BaseModel):
    """Single POC in ranking"""
    poc_name: str
    title: str
    company_name: str
    email: str
    email_info: EmailPatternInfo
    
    # Confidence scores
    title_authority_score: float
    product_relevance_score: float
    reporting_relevance_score: float
    combined_confidence_score: float  # 0-1.0
    
    # Breakdown
    score_breakdown: Dict[str, Any]  # Detailed explanation
    public_signals: List[str]  # Recent news, job postings, etc.
    is_anchor: bool
    rank: int

class DiscoveryResponse(BaseModel):
    """Discovery and ranking results"""
    company_name: str
    total_pocs_discovered: int
    ranked_pocs: List[POCRankingItem]
    discovery_timestamp: datetime
    cache_status: str  # fresh, cached, partial
    messages_ready: bool
    validation_warning: Optional[str] = None
    using_inferred_data: bool = False

class MessageDraftResponse(BaseModel):
    """Generated message draft"""
    poc_name: str
    poc_title: str
    message_draft: str
    personalization_level: str  # personal, generic
    personalization_notes: List[str]  # What signals were used

class FinalOutputResponse(BaseModel):
    """Final output ready for user"""
    company_name: str
    ranked_pocs: List[POCRankingItem]
    messages: List[MessageDraftResponse]
    ready_to_send: bool
    export_format: str  # json, csv
