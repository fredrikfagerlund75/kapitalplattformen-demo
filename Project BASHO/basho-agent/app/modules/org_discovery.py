"""
Organization discovery module
Discovers 1st-degree connected decision-makers
"""

from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
import asyncio
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

load_dotenv()

SCRAPING_DELAY = float(os.getenv("SCRAPING_DELAY_SECONDS", "2.5"))

class OrgDiscovery:
    def __init__(self):
        self.timeout = 10
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        self.last_request_time = 0
    
    async def _respect_delay(self):
        """Respect scraping delays between requests"""
        elapsed = time.time() - self.last_request_time
        if elapsed < SCRAPING_DELAY:
            await asyncio.sleep(SCRAPING_DELAY - elapsed)
        self.last_request_time = time.time()
    
    async def discover_org(self, company_name: str, anchor_poc_name: str, company_website: Optional[str] = None) -> Dict[str, Any]:
        """
        Discover organization structure and related POCs
        Returns: org structure with discovered POCs and their relationships
        """
        discovery_result = {
            "company_name": company_name,
            "anchor_poc": anchor_poc_name,
            "discovered_pocs": [],
            "job_postings": [],
            "news_signals": [],
            "email_patterns": [],
            "timestamp": datetime.utcnow().isoformat(),
            "validation_warning": None,
            "detected_company_tld": None
        }
        
        try:
            # Check if company_name looks like a person's name (possible validation error)
            if self._looks_like_person_name(company_name):
                discovery_result["validation_warning"] = (
                    f"⚠️ '{company_name}' looks like a person's name, not a company. "
                    f"POCs generated may not be accurate. Please verify the company name."
                )
            
            # Extract TLD from company_website if provided
            preferred_tld = None
            if company_website:
                preferred_tld = self._extract_tld_from_url(company_website)
                if preferred_tld:
                    discovery_result["detected_company_tld"] = preferred_tld
            
            # Detect likely company domains (.se, .com, .de, etc.)
            detected_domains = self._detect_company_domains(company_name, preferred_tld)
            discovery_result["detected_domains"] = detected_domains
            
            # Run discovery tasks in parallel where possible
            tasks = [
                self._discover_job_postings(company_name),
                self._discover_company_team_page(company_name),
                self._discover_news_and_signals(company_name),
                self._discover_linkedin_org(company_name),
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            job_postings = results[0] if not isinstance(results[0], Exception) else []
            team_page_data = results[1] if not isinstance(results[1], Exception) else {}
            news_signals = results[2] if not isinstance(results[2], Exception) else []
            linkedin_data = results[3] if not isinstance(results[3], Exception) else {}
            
            # Combine results
            discovery_result["job_postings"] = job_postings
            discovery_result["news_signals"] = news_signals
            
            # Extract POCs from team page
            if team_page_data.get("team_members"):
                for member in team_page_data["team_members"]:
                    discovery_result["discovered_pocs"].append({
                        "name": member.get("name"),
                        "title": member.get("title"),
                        "source": "company_website",
                        "email": member.get("email"),
                    })
            
            # Extract POCs from job postings (hiring managers, etc.)
            for posting in job_postings:
                if posting.get("hiring_manager"):
                    discovery_result["discovered_pocs"].append({
                        "name": posting["hiring_manager"],
                        "title": posting.get("hiring_manager_title", "Unknown"),
                        "source": "job_posting",
                        "inferred": True,
                    })
            
            # Extract POCs from LinkedIn org data
            if linkedin_data.get("employees"):
                for emp in linkedin_data["employees"][:10]:  # Limit to top 10
                    discovery_result["discovered_pocs"].append({
                        "name": emp.get("name"),
                        "title": emp.get("title"),
                        "source": "linkedin",
                        "email": emp.get("email"),
                    })
            
            # If no POCs discovered, add company-relevant mock data
            if not discovery_result["discovered_pocs"]:
                discovery_result["discovered_pocs"] = self._generate_company_pocs(company_name, preferred_tld)
                
                # Flag that we're using inferred/mock data
                discovery_result["using_inferred_data"] = True
                if not discovery_result["validation_warning"]:
                    discovery_result["validation_warning"] = (
                        f"⚠️ No real POCs found for {company_name}. The suggested POCs below are AI-generated based on company type "
                        f"and may not be actual employees. Verify names and email patterns before reaching out."
                    )
                else:
                    discovery_result["validation_warning"] += (
                        f"\n\n⚠️ Additionally, the suggested POCs are AI-generated based on company type, not real employee data. "
                        f"Please verify before outreach."
                    )
            else:
                discovery_result["using_inferred_data"] = False
            
            # Validate POCs against company domain to catch mismatches
            domain_validation = await self._validate_pocs_against_domain(
                discovery_result["discovered_pocs"],
                company_name,
                anchor_poc_name
            )
            
            # Add domain validation warning if mismatches detected
            if domain_validation.get("warning"):
                if discovery_result["validation_warning"]:
                    discovery_result["validation_warning"] += "\n\n" + domain_validation["warning"]
                else:
                    discovery_result["validation_warning"] = domain_validation["warning"]
            
            # Attach relevant news signals and hooks to each POC
            for poc in discovery_result["discovered_pocs"]:
                poc["public_signals"] = self._identify_relevant_hooks(
                    company_name=company_name,
                    poc_name=poc.get("name"),
                    poc_title=poc.get("title"),
                    news_signals=news_signals
                )
            
            return discovery_result
        
        except Exception as e:
            discovery_result["error"] = str(e)
            return discovery_result
    
    def _generate_company_pocs(self, company_name: str, preferred_tld: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate contextually relevant POCs based on company industry/type"""
        import hashlib
        
        # Use company name to seed deterministic but varied POCs
        company_seed = hashlib.md5(company_name.lower().encode()).hexdigest()
        seed_val = int(company_seed[:8], 16)
        
        # Default to .com if no TLD specified
        tld = preferred_tld or 'com'
        
        # Define POC pools by common company roles
        first_names = [
            "Jan", "Marie", "Hans", "Peter", "Anna", "Erik", "Katarina", "Magnus", 
            "Sofia", "Anders", "Linda", "Robert", "Ingrid", "Soren", "Kerstin"
        ]
        last_names = [
            "Anderson", "Berg", "Cohen", "Dahl", "Eriksson", "Fernandez", "Gabrielsen",
            "Hansen", "Iverson", "Jensen", "Karlsson", "Larsson", "Meyer", "Nielsen",
            "Olsson", "Petersen", "Quist", "Robertsson", "Svensson", "Thoren"
        ]
        
        # Determine likely roles based on company name patterns
        titles_by_type = {
            "tech": [
                "VP of Engineering",
                "Chief Technology Officer",
                "Head of Product",
                "Director of Digital Innovation",
                "Chief Innovation Officer"
            ],
            "consulting": [
                "Managing Partner",
                "Senior Consultant",
                "Partner - Digital Transformation",
                "Director of Client Services",
                "Head of Strategy"
            ],
            "manufacturing": [
                "Director of Operations",
                "VP of Manufacturing",
                "Chief Operations Officer",
                "Head of Digital Transformation",
                "Director of Supply Chain"
            ],
            "finance": [
                "Chief Financial Officer",
                "VP of Finance",
                "Director of Treasury",
                "Head of Risk Management",
                "Controller"
            ],
            "marketing": [
                "Chief Marketing Officer",
                "VP of Marketing",
                "Director of Digital Marketing",
                "Head of Brand Strategy",
                "Director of Customer Experience"
            ],
            "default": [
                "Vice President of Operations",
                "Director of Business Development",
                "Head of Strategy & Innovation",
                "Chief Operating Officer",
                "Senior Director of Digital"
            ]
        }
        
        # Infer company type from name
        company_lower = company_name.lower()
        if any(word in company_lower for word in ["tech", "systems", "software", "ai", "cloud", "digital"]):
            titles = titles_by_type["tech"]
        elif any(word in company_lower for word in ["consult", "advisory"]):
            titles = titles_by_type["consulting"]
        elif any(word in company_lower for word in ["manufact", "industrial", "production"]):
            titles = titles_by_type["manufacturing"]
        elif any(word in company_lower for word in ["bank", "finance", "investment", "capital"]):
            titles = titles_by_type["finance"]
        elif any(word in company_lower for word in ["market", "advertis", "media", "brand"]):
            titles = titles_by_type["marketing"]
        else:
            titles = titles_by_type["default"]
        
        # Generate 4-5 realistic POCs for this company
        pocs = []
        num_pocs = 4 + (seed_val % 2)  # 4 or 5 POCs
        
        for i in range(num_pocs):
            # Use seed to pick deterministic but company-specific names
            fname_idx = (seed_val + i * 13) % len(first_names)
            lname_idx = (seed_val + i * 17) % len(last_names)
            title_idx = (seed_val + i * 7) % len(titles)
            
            first_name = first_names[fname_idx]
            last_name = last_names[lname_idx]
            title = titles[title_idx]
            
            pocs.append({
                "name": f"{first_name} {last_name}",
                "title": title,
                "source": "company_inferred",
                "email": f"{first_name.lower()}.{last_name.lower()}@{company_name.lower().replace(' ', '')}.{tld}",
                "inferred": True
            })
        
        return pocs
    
    def _looks_like_person_name(self, text: str) -> bool:
        """
        Heuristic check if the input looks like a person's name rather than a company
        Returns True if it looks like a name
        """
        text_lower = text.lower().strip()
        
        # Company name indicators
        company_indicators = [
            'inc', 'ltd', 'llc', 'corp', 'company', 'group', 'solutions',
            'tech', 'systems', 'software', 'services', 'consulting', 'partners',
            'agency', 'digital', 'media', 'labs', 'studio', 'works', 'hub',
            'bank', 'capital', 'fund', 'ventures', 'enterprises', 'industries',
            'manufacturing', 'products', 'industries', 'hospitality', 'hotels',
            'airlines', 'energy', 'pharmaceutical', 'healthcare', 'retail',
            'limited', 'gmbh', 'ag', 'sa', 'pty', 'nv', 'ab'
        ]
        
        # Check if any company indicator is present
        for indicator in company_indicators:
            if indicator in text_lower:
                return False
        
        # Person name patterns: Usually FirstName LastName (2 words, both capitalized or title case)
        words = text.strip().split()
        
        # If only 1-2 words and looks like first/last name pattern
        if len(words) <= 2:
            # Check if they look like proper names (start with capital)
            for word in words:
                # Very short words are suspicious (like "A" or "B")
                if len(word) < 2:
                    return False
                # All lowercase names (like "john smith") are less likely company names
                # Unless they're tech company names (like "stripe", "okta", "slack")
                if word.islower() and word not in ['stripe', 'slack', 'okta', 'uber', 'lyft', 'github', 'gitlab', 'adobe', 'asana']:
                    # Check if it looks like a word (not an acronym or typical company pattern)
                    if len(word) <= 5 and word.isalpha():
                        # Could be a first name
                        common_first_names = [
                            'john', 'jane', 'michael', 'stina', 'marie', 'erik', 'anna',
                            'hans', 'peter', 'james', 'robert', 'david', 'paul', 'mark',
                            'linda', 'susan', 'karen', 'lisa', 'nancy', 'sandra', 'ashley'
                        ]
                        if word in common_first_names:
                            return True
            
            # If 2 capitalized words without company indicators, likely a person name
            if len(words) == 2:
                word1_cap = words[0][0].isupper()
                word2_cap = words[1][0].isupper() if len(words[1]) > 0 else False
                
                # Both words capitalized and short-ish = person name pattern
                if word1_cap and word2_cap:
                    if len(words[0]) < 15 and len(words[1]) < 15:
                        return True
        
        return False
    
    def _extract_tld_from_url(self, url: str) -> Optional[str]:
        """Extract TLD from a URL or domain string"""
        import re
        
        if not url:
            return None
        
        # Remove protocol if present
        url = url.replace('https://', '').replace('http://', '').replace('www.', '')
        
        # Extract TLD
        match = re.search(r'\.([a-z]{2,})(?:[/?]|$)', url.lower())
        if match:
            return match.group(1)
        
        return None
    
    def _detect_company_domains(self, company_name: str, preferred_tld: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Detect likely company domains for a given company name
        Returns list of likely domain variations (e.g., .com, .se, .de, etc.)
        If preferred_tld is provided, it's prioritized
        """
        import re
        
        company_slug = company_name.lower().replace(' ', '').replace('ä', 'a').replace('ö', 'o')
        company_hyphen = company_name.lower().replace(' ', '-').replace('ä', 'a').replace('ö', 'o')
        
        # Common TLDs to check (prioritized by likelihood)
        tlds = ['com', 'se', 'de', 'nl', 'dk', 'no', 'ch', 'uk', 'fr', 'eu', 'io', 'co']
        
        # Move preferred TLD to front if specified
        if preferred_tld and preferred_tld in tlds:
            tlds.remove(preferred_tld)
            tlds.insert(0, preferred_tld)
        
        domains = []
        for tld in tlds:
            domains.append({
                "domain": f"{company_slug}.{tld}",
                "tld": tld,
                "variants": [
                    f"www.{company_slug}.{tld}",
                    f"{company_hyphen}.{tld}",
                    f"www.{company_hyphen}.{tld}"
                ]
            })
        
        return domains
    
    def _extract_email_domain(self, email: str) -> Optional[str]:
        """Extract domain from email address"""
        if not email or '@' not in email:
            return None
        return email.split('@')[1].lower()
    
    async def _detect_actual_company_domain(self, company_name: str) -> Optional[str]:
        """
        Try to detect the actual company domain by checking various possibilities
        Returns the most likely domain or None if not found
        """
        detected_domains = self._detect_company_domains(company_name)
        
        async with httpx.AsyncClient() as client:
            for domain_info in detected_domains:
                for variant in domain_info["variants"][:2]:  # Check first 2 variants per TLD
                    url = f"https://{variant}"
                    try:
                        response = await client.head(url, timeout=5, follow_redirects=True)
                        if response.status_code < 400:
                            return domain_info["tld"]
                    except:
                        pass
        
        return None
    
    async def _validate_pocs_against_domain(self, pocs: List[Dict], company_name: str, anchor_poc_name: str) -> Dict[str, Any]:
        """
        Validate that discovered POCs are actually from the same company
        Returns validation result with any domain mismatches detected
        """
        validation = {
            "has_domain_mismatch": False,
            "warning": None,
            "mismatched_poc_indices": []
        }
        
        # Try to detect the actual company domain
        actual_domain = await self._detect_actual_company_domain(company_name)
        
        if not actual_domain:
            # Can't validate without knowing the actual domain
            return validation
        
        # Check if any POCs have mismatched email domains
        for idx, poc in enumerate(pocs):
            email = poc.get("email", "")
            if email and "@" in email:
                email_domain = self._extract_email_domain(email)
                
                # If email domain doesn't match expected domain, flag it
                if email_domain and actual_domain not in email_domain:
                    # Check if this is a different country TLD for the same company
                    if not any(actual_domain in email_domain for actual_domain in [actual_domain, company_name.lower()]):
                        validation["has_domain_mismatch"] = True
                        validation["mismatched_poc_indices"].append(idx)
        
        if validation["has_domain_mismatch"]:
            validation["warning"] = (
                f"⚠️ Some suggested POCs appear to be from a different company domain ({actual_domain}). "
                f"They may not be related to your input. Consider deleting them."
            )
        
        return validation

    
    async def _discover_job_postings(self, company_name: str) -> List[Dict]:
        """Discover job postings from company careers page"""
        try:
            postings = []
            await self._respect_delay()
            
            # Try company careers page
            careers_urls = [
                f"https://{company_name.lower().replace(' ', '')}.com/careers",
                f"https://www.{company_name.lower().replace(' ', '')}.com/careers",
                f"https://{company_name.lower().replace(' ', '-')}.com/careers",
            ]
            
            async with httpx.AsyncClient() as client:
                for url in careers_urls:
                    try:
                        response = await client.get(url, timeout=self.timeout, headers=self.headers)
                        if response.status_code == 200:
                            soup = BeautifulSoup(response.text, "html.parser")
                            
                            # Look for job postings
                            job_elements = soup.find_all(
                                ["div", "article"],
                                class_=["job", "position", "posting", "job-card"]
                            )
                            
                            for job in job_elements[:5]:  # Get first 5 jobs
                                job_data = {
                                    "title": job.find(["h2", "h3", "h4"]),
                                    "department": self._extract_department(job.text),
                                    "source": "careers_page",
                                    "url": url
                                }
                                if job_data["title"]:
                                    postings.append(job_data)
                        break
                    except:
                        continue
            
            return postings
        except Exception as e:
            print(f"Error discovering job postings: {e}")
            return []
    
    async def _discover_company_team_page(self, company_name: str) -> Dict:
        """Discover team members from company website"""
        try:
            await self._respect_delay()
            
            team_urls = [
                f"https://www.{company_name.lower().replace(' ', '')}.com/team",
                f"https://{company_name.lower().replace(' ', '')}.com/team",
                f"https://www.{company_name.lower().replace(' ', '-')}.com/team",
                f"https://www.{company_name.lower().replace(' ', '')}.com/leadership",
            ]
            
            async with httpx.AsyncClient() as client:
                for url in team_urls:
                    try:
                        response = await client.get(url, timeout=self.timeout, headers=self.headers)
                        if response.status_code == 200:
                            soup = BeautifulSoup(response.text, "html.parser")
                            
                            team_members = []
                            member_cards = soup.find_all(
                                ["div", "article", "li"],
                                class_=["team-member", "employee", "member", "person"]
                            )
                            
                            for member in member_cards[:10]:  # Get first 10
                                member_data = {
                                    "name": self._extract_name(member.text),
                                    "title": self._extract_title(member.text),
                                    "email": self._extract_email(member.text),
                                }
                                team_members.append(member_data)
                            
                            return {"team_members": team_members, "url": url}
                    except:
                        continue
            
            return {"team_members": []}
        except Exception as e:
            print(f"Error discovering team page: {e}")
            return {}
    
    async def _discover_news_and_signals(self, company_name: str) -> List[Dict]:
        """Discover news and public signals about company"""
        try:
            news_signals = []
            
            # Source 1: Google News RSS feed
            await self._respect_delay()
            google_news = await self._fetch_google_news(company_name)
            news_signals.extend(google_news)
            
            # Source 2: Company blog/news section
            await self._respect_delay()
            company_news = await self._fetch_company_blog(company_name)
            news_signals.extend(company_news)
            
            # Source 3: LinkedIn news (via scraping recent posts)
            await self._respect_delay()
            linkedin_news = await self._fetch_linkedin_company_news(company_name)
            news_signals.extend(linkedin_news)
            
            return news_signals[:5]  # Return top 5 most relevant news items
        
        except Exception as e:
            print(f"Error discovering news for {company_name}: {str(e)}")
            return []
    
    async def _fetch_google_news(self, company_name: str) -> List[Dict]:
        """Fetch news from Google News RSS feed"""
        try:
            import feedparser
            
            # Google News RSS feed for company
            url = f"https://news.google.com/rss/search?q={company_name}&ceid=US:en&hl=en"
            
            async with httpx.AsyncClient(headers=self.headers, timeout=10) as client:
                response = await client.get(url, follow_redirects=True)
                
                # Parse RSS feed
                feed = feedparser.parse(response.content)
                
                news_items = []
                for entry in feed.entries[:3]:  # Top 3 articles
                    news_items.append({
                        "source": "Google News",
                        "headline": entry.get("title", ""),
                        "link": entry.get("link", ""),
                        "published": entry.get("published", ""),
                        "summary": entry.get("summary", "")[:200],  # First 200 chars
                    })
                
                return news_items
        
        except Exception as e:
            print(f"Error fetching Google News: {str(e)}")
            return []
    
    async def _fetch_company_blog(self, company_name: str) -> List[Dict]:
        """Fetch news from company blog/press section"""
        try:
            # Try common URLs for company news
            news_urls = [
                f"https://{company_name.lower().replace(' ', '')}.com/blog",
                f"https://{company_name.lower().replace(' ', '')}.com/news",
                f"https://{company_name.lower().replace(' ', '')}.com/press",
            ]
            
            news_items = []
            
            async with httpx.AsyncClient(headers=self.headers, timeout=10) as client:
                for url in news_urls:
                    try:
                        response = await client.get(url, follow_redirects=True)
                        if response.status_code == 200:
                            soup = BeautifulSoup(response.content, 'html.parser')
                            
                            # Look for article headlines
                            articles = soup.find_all(['h2', 'h3'], limit=3)
                            for article in articles:
                                text = article.get_text().strip()
                                if text and len(text) > 10:
                                    news_items.append({
                                        "source": "Company Blog",
                                        "headline": text[:100],
                                        "link": url,
                                        "published": "Recent",
                                    })
                            
                            if news_items:
                                break
                    
                    except Exception:
                        continue
            
            return news_items[:2]
        
        except Exception as e:
            print(f"Error fetching company blog: {str(e)}")
            return []
    
    async def _fetch_linkedin_company_news(self, company_name: str) -> List[Dict]:
        """Fetch recent news/updates from LinkedIn company page"""
        try:
            # Mock LinkedIn company news (in production, would use LinkedIn API or scraping)
            # For now, return structured placeholder that includes company context
            return [
                {
                    "source": "LinkedIn Company",
                    "headline": f"{company_name} announces new initiatives and team expansion",
                    "published": "Recent",
                    "type": "company_update",
                }
            ]
        
        except Exception as e:
            print(f"Error fetching LinkedIn news: {str(e)}")
            return []
    
    async def _discover_linkedin_org(self, company_name: str) -> Dict:
        """Discover organization structure via LinkedIn"""
        try:
            # Note: We don't scrape LinkedIn directly
            # This would be user-provided or via manual search
            return {"employees": []}
        except Exception:
            return {}
    
    def _identify_relevant_hooks(
        self,
        company_name: str,
        poc_name: str,
        poc_title: str,
        news_signals: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Identify relevant hooks/signals for a specific POC based on:
        1. Their title/role
        2. Company news and signals
        3. Market trends
        Returns: list of relevant hooks to use in outreach
        """
        hooks = []
        
        # Analyze title to identify relevant interests
        title_lower = poc_title.lower() if poc_title else ""
        
        # Marketing/content roles - care about reach and engagement
        if any(word in title_lower for word in ["marketing", "content", "brand", "communications"]):
            hooks.extend([
                f"{poc_name} leads marketing at {company_name} - likely focused on audience engagement and content reach",
                f"Recent CMO/Marketing Director role at {company_name} suggests focus on digital strategy",
            ])
        
        # Product/Operations roles - care about efficiency and user experience
        if any(word in title_lower for word in ["product", "operations", "cto", "cfo", "vp"]):
            hooks.extend([
                f"Strategic role at {company_name} - decision-maker on tech/operational improvements",
                f"{poc_title} typically evaluates solutions for process optimization and team efficiency",
            ])
        
        # Sales/Revenue roles - care about growth and pipeline
        if any(word in title_lower for word in ["sales", "revenue", "growth", "business development"]):
            hooks.extend([
                f"{poc_name}'s role in driving revenue at {company_name}",
                f"Sales leadership position suggests interest in enabling team productivity",
            ])
        
        # Add company-specific news signals
        if news_signals:
            # Take top 2 news signals
            for signal in news_signals[:2]:
                if isinstance(signal, dict):
                    signal_text = signal.get("headline", signal.get("text", ""))
                    if signal_text:
                        hooks.append(f"Recent news: {signal_text[:100]}")
                elif isinstance(signal, str):
                    hooks.append(f"Recent news: {signal[:100]}")
        
        # Add generic hooks if none found
        if not hooks:
            hooks = [
                f"{poc_title} at {company_name} - decision-maker in key initiative",
                f"Recent activity/focus likely includes team scaling and digital transformation",
            ]
        
        return hooks[:3]  # Return top 3 most relevant hooks
    
    def _extract_name(self, text: str) -> Optional[str]:
        """Extract name from text"""
        lines = text.split('\n')
        # First non-empty line is usually the name
        for line in lines:
            line = line.strip()
            if line and len(line) < 100:
                return line
        return None
    
    def _extract_title(self, text: str) -> Optional[str]:
        """Extract job title from text"""
        lines = text.split('\n')
        # Second line often contains title
        if len(lines) > 1:
            for line in lines[1:]:
                line = line.strip()
                if line and any(word in line.lower() for word in ['director', 'manager', 'officer', 'lead', 'head', 'chief', 'vp']):
                    return line
        return None
    
    def _extract_email(self, text: str) -> Optional[str]:
        """Extract email from text"""
        import re
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        match = re.search(email_pattern, text)
        return match.group(0) if match else None
    
    def _extract_department(self, text: str) -> Optional[str]:
        """Extract department from job posting"""
        departments = ['marketing', 'sales', 'engineering', 'product', 'finance', 'hr', 'operations']
        for dept in departments:
            if dept in text.lower():
                return dept
        return None
