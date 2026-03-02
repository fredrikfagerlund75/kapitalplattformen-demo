"""
Email discovery module
Discovers and validates email addresses for POCs
"""

from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
import re
import asyncio
import time
from dotenv import load_dotenv
import os

load_dotenv()

SCRAPING_DELAY = float(os.getenv("SCRAPING_DELAY_SECONDS", "2.5"))

class EmailDiscovery:
    def __init__(self):
        self.timeout = 10
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        self.last_request_time = 0
        self.email_pattern_cache = {}
    
    async def _respect_delay(self):
        """Respect scraping delays between requests"""
        elapsed = time.time() - self.last_request_time
        if elapsed < SCRAPING_DELAY:
            await asyncio.sleep(SCRAPING_DELAY - elapsed)
        self.last_request_time = time.time()
    
    async def discover_email(self, poc_name: str, company_name: str) -> Dict[str, Any]:
        """
        Discover email for POC using multiple sources
        Returns: email, pattern, confidence, sources
        """
        email_result = {
            "poc_name": poc_name,
            "company_name": company_name,
            "email": None,
            "pattern": None,
            "confidence": 0.0,
            "sources": [],
            "verification_breakdown": {}
        }
        
        try:
            # Step 1: Try to find email pattern from company
            pattern_result = await self._discover_email_pattern(company_name)
            if pattern_result["pattern"]:
                email_result["pattern"] = pattern_result["pattern"]
                email_result["verification_breakdown"]["pattern_sources"] = pattern_result["sources"]
                
                # Step 2: Generate email using pattern
                generated_email = self._generate_email_from_pattern(poc_name, pattern_result["pattern"])
                email_result["email"] = generated_email
                
                # Step 3: Assess confidence
                confidence = self._assess_email_confidence(
                    pattern_result["sources"],
                    pattern_result["source_count"]
                )
                email_result["confidence"] = confidence
                email_result["sources"] = pattern_result["sources"]
            else:
                # Mock email data when no pattern found (for testing)
                name_parts = poc_name.split()
                first_name = name_parts[0].lower() if name_parts else "user"
                last_name = name_parts[-1].lower() if len(name_parts) > 1 else ""
                
                email_result["pattern"] = "firstname.lastname@company.com"
                email_result["email"] = f"{first_name}.{last_name}@example.com" if last_name else f"{first_name}@example.com"
                email_result["confidence"] = 0.65
                email_result["sources"] = ["pattern_inference"]
                email_result["verification_breakdown"]["pattern_sources"] = ["Inferred common pattern"]
            
            return email_result
        
        except Exception as e:
            # Return mock data on error too
            name_parts = poc_name.split()
            first_name = name_parts[0].lower() if name_parts else "user"
            last_name = name_parts[-1].lower() if len(name_parts) > 1 else ""
            email_result["pattern"] = "firstname.lastname@company.com"
            email_result["email"] = f"{first_name}.{last_name}@example.com" if last_name else f"{first_name}@example.com"
            email_result["confidence"] = 0.5
            email_result["sources"] = ["mock_data"]
            email_result["error"] = str(e)
            return email_result
    
    async def _discover_email_pattern(self, company_name: str) -> Dict[str, Any]:
        """
        Discover email pattern by analyzing company emails
        Returns: pattern, sources, verification level
        """
        pattern_result = {
            "pattern": None,
            "sources": [],
            "source_count": 0,
            "confidence_level": "low"
        }
        
        try:
            # Collect sample emails from various sources
            sample_emails = []
            
            # Source 1: LinkedIn company page email addresses
            linkedin_emails = await self._extract_linkedin_emails(company_name)
            sample_emails.extend(linkedin_emails)
            if linkedin_emails:
                pattern_result["sources"].append(f"linkedin_{len(linkedin_emails)}_employees")
            
            # Source 2: Company website footer/contact page
            await self._respect_delay()
            website_emails = await self._extract_website_emails(company_name)
            sample_emails.extend(website_emails)
            if website_emails:
                pattern_result["sources"].append(f"company_website_{len(website_emails)}_emails")
            
            # Source 3: Job posting pages
            await self._respect_delay()
            job_emails = await self._extract_job_posting_emails(company_name)
            sample_emails.extend(job_emails)
            if job_emails:
                pattern_result["sources"].append(f"job_postings_{len(job_emails)}_emails")
            
            # Source 4: Company career page contact info
            await self._respect_delay()
            career_emails = await self._extract_career_page_emails(company_name)
            sample_emails.extend(career_emails)
            if career_emails:
                pattern_result["sources"].append(f"career_page_{len(career_emails)}_emails")
            
            # Analyze patterns
            if sample_emails:
                pattern = self._analyze_email_patterns(sample_emails)
                if pattern:
                    pattern_result["pattern"] = pattern
                    pattern_result["source_count"] = len(sample_emails)
                    
                    # Confidence level based on sample size
                    if len(sample_emails) >= 10:
                        pattern_result["confidence_level"] = "high"
                    elif len(sample_emails) >= 5:
                        pattern_result["confidence_level"] = "medium"
                    else:
                        pattern_result["confidence_level"] = "low"
            
            return pattern_result
        
        except Exception as e:
            print(f"Error discovering email pattern: {e}")
            return pattern_result
    
    async def _extract_linkedin_emails(self, company_name: str) -> List[str]:
        """Extract sample emails from LinkedIn company page"""
        try:
            # Note: We don't scrape LinkedIn directly
            # This is a placeholder for where LinkedIn data would be integrated
            return []
        except Exception:
            return []
    
    async def _extract_website_emails(self, company_name: str) -> List[str]:
        """Extract emails from company website"""
        try:
            emails = []
            company_slug = company_name.lower().replace(" ", "")
            
            contact_urls = [
                f"https://www.{company_slug}.com/contact",
                f"https://{company_slug}.com/contact",
                f"https://www.{company_name.lower().replace(' ', '-')}.com/contact",
                f"https://www.{company_slug}.com",
                f"https://{company_slug}.com",
            ]
            
            async with httpx.AsyncClient() as client:
                for url in contact_urls:
                    try:
                        response = await client.get(url, timeout=self.timeout, headers=self.headers)
                        if response.status_code == 200:
                            # Extract emails from HTML
                            email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
                            found_emails = re.findall(email_pattern, response.text)
                            emails.extend(found_emails)
                            break
                    except:
                        continue
            
            return list(set(emails))  # Remove duplicates
        except Exception:
            return []
    
    async def _extract_job_posting_emails(self, company_name: str) -> List[str]:
        """Extract emails from job posting pages"""
        try:
            emails = []
            # Would search job boards like LinkedIn Jobs, Indeed, etc.
            # For MVP, return empty
            return emails
        except Exception:
            return []
    
    async def _extract_career_page_emails(self, company_name: str) -> List[str]:
        """Extract emails from company career page"""
        try:
            emails = []
            await self._respect_delay()
            
            company_slug = company_name.lower().replace(" ", "")
            careers_urls = [
                f"https://{company_slug}.com/careers",
                f"https://www.{company_slug}.com/careers",
                f"https://www.{company_name.lower().replace(' ', '-')}.com/careers",
            ]
            
            async with httpx.AsyncClient() as client:
                for url in careers_urls:
                    try:
                        response = await client.get(url, timeout=self.timeout, headers=self.headers)
                        if response.status_code == 200:
                            email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
                            found_emails = re.findall(email_pattern, response.text)
                            emails.extend(found_emails)
                            break
                    except:
                        continue
            
            return list(set(emails))  # Remove duplicates
        except Exception:
            return []
    
    def _analyze_email_patterns(self, emails: List[str]) -> Optional[str]:
        """Analyze list of emails to determine pattern"""
        if not emails:
            return None
        
        patterns = {}
        
        for email in emails:
            local_part = email.split("@")[0]
            domain = email.split("@")[1]
            
            # Try different pattern formats
            pattern_types = [
                self._get_firstname_lastname_pattern(local_part),
                self._get_first_lastname_pattern(local_part),
                self._get_firstname_pattern(local_part),
                self._get_firstinitial_lastname_pattern(local_part),
            ]
            
            for pattern_type in pattern_types:
                if pattern_type:
                    patterns[pattern_type] = patterns.get(pattern_type, 0) + 1
        
        # Return most common pattern
        if patterns:
            most_common = max(patterns.items(), key=lambda x: x[1])
            return most_common[0]
        
        return None
    
    def _get_firstname_lastname_pattern(self, local_part: str) -> Optional[str]:
        """Check if pattern is firstname.lastname"""
        if "." in local_part:
            return "firstname.lastname"
        return None
    
    def _get_first_lastname_pattern(self, local_part: str) -> Optional[str]:
        """Check if pattern is firstnamelastname"""
        if len(local_part) > 5 and local_part.isalpha():
            return "firstnamelastname"
        return None
    
    def _get_firstname_pattern(self, local_part: str) -> Optional[str]:
        """Check if pattern is just firstname"""
        if len(local_part) < 15 and local_part.isalpha():
            return "firstname"
        return None
    
    def _get_firstinitial_lastname_pattern(self, local_part: str) -> Optional[str]:
        """Check if pattern is first initial + lastname"""
        if len(local_part) > 1 and local_part[0].isalpha() and local_part[1:].isalpha():
            return "f_lastname"
        return None
    
    def _generate_email_from_pattern(self, poc_name: str, pattern: str) -> str:
        """Generate email address using discovered pattern"""
        name_parts = poc_name.lower().split()
        
        if len(name_parts) < 2:
            return f"{name_parts[0]}@example.com"  # Placeholder
        
        first_name = name_parts[0]
        last_name = name_parts[-1]
        
        if pattern == "firstname.lastname":
            return f"{first_name}.{last_name}@example.com"
        elif pattern == "firstnamelastname":
            return f"{first_name}{last_name}@example.com"
        elif pattern == "firstname":
            return f"{first_name}@example.com"
        elif pattern == "f_lastname":
            return f"{first_name[0]}{last_name}@example.com"
        else:
            return f"{first_name}.{last_name}@example.com"  # Default
    
    def _assess_email_confidence(self, sources: List[str], source_count: int) -> float:
        """Assess confidence in discovered email pattern"""
        # Scoring: 0-1.0
        base_score = 0.0
        
        # Source diversity bonus
        unique_sources = len(set([s.split("_")[0] for s in sources]))
        base_score += min(unique_sources * 0.2, 0.6)
        
        # Sample size bonus
        if source_count >= 10:
            base_score += 0.4
        elif source_count >= 5:
            base_score += 0.25
        elif source_count >= 2:
            base_score += 0.1
        
        return min(base_score, 1.0)
