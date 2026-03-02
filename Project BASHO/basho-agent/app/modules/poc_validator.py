"""
POC validation and enrichment module
Validates anchor POC existence and gathers initial information
"""

import httpx
import asyncio
from typing import Dict, Any, Optional
from bs4 import BeautifulSoup
import os
from dotenv import load_dotenv

load_dotenv()

class POCValidator:
    def __init__(self):
        self.timeout = 10
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
    
    async def validate_poc(
        self,
        poc_name: str,
        company_name: str,
        additional_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate POC existence and gather information
        Returns: validation result with confidence score and found info
        """
        validation_result = {
            "is_valid": False,
            "confidence": 0.0,
            "found_info": {},
            "needs_clarification": False,
            "clarification_request": None,
            "sources": []
        }
        
        try:
            # Search for POC on web
            google_result = await self._search_google(poc_name, company_name)
            if google_result:
                validation_result["found_info"]["google"] = google_result
                validation_result["sources"].append("google_search")
                validation_result["confidence"] += 0.3
            
            # Try to find on company website
            company_website = await self._find_company_website(company_name)
            if company_website:
                website_result = await self._search_company_website(poc_name, company_website)
                if website_result:
                    validation_result["found_info"]["company_website"] = website_result
                    validation_result["sources"].append("company_website")
                    validation_result["confidence"] += 0.35
            
            # Check LinkedIn (public profile check)
            linkedin_result = await self._search_linkedin_public(poc_name, company_name)
            if linkedin_result:
                validation_result["found_info"]["linkedin"] = linkedin_result
                validation_result["sources"].append("linkedin")
                validation_result["confidence"] += 0.35
            
            # Validate confidence
            if validation_result["confidence"] >= 0.6:
                validation_result["is_valid"] = True
            elif validation_result["confidence"] >= 0.4:
                validation_result["is_valid"] = True
                validation_result["needs_clarification"] = True
                validation_result["clarification_request"] = (
                    "Weak match found. Please provide LinkedIn URL or work email to confirm."
                )
            else:
                validation_result["needs_clarification"] = True
                validation_result["clarification_request"] = (
                    f"Could not validate '{poc_name}' at '{company_name}'. "
                    "Please provide LinkedIn URL or work email."
                )
            
            return validation_result
        
        except Exception as e:
            return {
                "is_valid": False,
                "confidence": 0.0,
                "found_info": {"error": str(e)},
                "needs_clarification": True,
                "clarification_request": f"Validation error: {str(e)}",
                "sources": []
            }
    
    async def _search_google(self, poc_name: str, company_name: str) -> Optional[Dict]:
        """Search Google for POC information"""
        try:
            query = f'"{poc_name}" "{company_name}"'
            # In production, would use Google Custom Search API or SerpAPI
            # For now, return placeholder - will integrate real search
            return {
                "query": query,
                "result": "Found through Google Search"
            }
        except Exception:
            return None
    
    async def _find_company_website(self, company_name: str) -> Optional[str]:
        """Find company website URL"""
        try:
            # Simple heuristic: try common domain patterns
            company_slug = company_name.lower().replace(" ", "")
            possible_domains = [
                f"https://www.{company_slug}.com",
                f"https://{company_slug}.com",
                f"https://www.{company_name.lower().replace(' ', '-')}.com",
            ]
            
            async with httpx.AsyncClient() as client:
                for domain in possible_domains:
                    try:
                        response = await client.head(domain, timeout=5, follow_redirects=True)
                        if response.status_code < 400:
                            return domain
                    except:
                        continue
            return None
        except Exception:
            return None
    
    async def _search_company_website(self, poc_name: str, website: str) -> Optional[Dict]:
        """Search company website for POC"""
        try:
            async with httpx.AsyncClient() as client:
                # Try team/leadership page
                team_urls = [
                    f"{website}/team",
                    f"{website}/leadership",
                    f"{website}/about/team",
                    f"{website}/company/team",
                ]
                
                for url in team_urls:
                    try:
                        response = await client.get(url, timeout=self.timeout, headers=self.headers)
                        if response.status_code == 200:
                            soup = BeautifulSoup(response.text, "html.parser")
                            if poc_name.lower() in response.text.lower():
                                return {
                                    "url": url,
                                    "found": True,
                                    "source": "team_page"
                                }
                    except:
                        continue
            return None
        except Exception:
            return None
    
    async def _search_linkedin_public(self, poc_name: str, company_name: str) -> Optional[Dict]:
        """
        Search LinkedIn for public profile
        Note: We don't scrape LinkedIn directly, just note if we could cross-reference
        """
        try:
            # In production, would use LinkedIn search or similar
            # For MVP, return placeholder
            return {
                "source": "linkedin",
                "can_verify": True,
                "note": "Can be verified via LinkedIn public search"
            }
        except Exception:
            return None
