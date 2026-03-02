"""
Claude integration module
Generates personalized outreach messages using Claude API
"""

from typing import List, Dict, Any, Optional
from anthropic import Anthropic
import os
from dotenv import load_dotenv

load_dotenv()

class ClaudeMessageGenerator:
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        self.client = Anthropic(api_key=api_key) if api_key else None
        self.model = "claude-opus-4-1"  # Try Opus model
        self.has_api_key = bool(api_key)
    
    async def generate_outreach_message(
        self,
        poc_name: str,
        poc_title: str,
        company_name: str,
        your_company: str,
        product_type: str,
        public_signals: List[str],
        discovered_personal_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate personalized outreach message for POC
        Returns: message draft, personalization level, and explanation
        """
        
        # Determine if we have enough personal info for personalized message
        has_personal_signals = (
            discovered_personal_info and 
            any(discovered_personal_info.get(key) for key in ["recent_news", "recent_hire", "linked_article"])
        )
        
        tone = "personal" if has_personal_signals else "neutral"
        
        # Build prompt
        prompt = self._build_message_prompt(
            poc_name=poc_name,
            poc_title=poc_title,
            company_name=company_name,
            your_company=your_company,
            product_type=product_type,
            public_signals=public_signals,
            discovered_personal_info=discovered_personal_info,
            tone=tone
        )
        
        try:
            # If no API key, use mock message
            if not self.has_api_key:
                message_draft = self._generate_mock_message(poc_name, poc_title, company_name, tone)
            else:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=300,
                    messages=[
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                )
                message_draft = response.content[0].text if response.content else ""
            
            return {
                "poc_name": poc_name,
                "poc_title": poc_title,
                "message_draft": message_draft,
                "personalization_level": tone,
                "personalization_notes": self._extract_signals_used(
                    discovered_personal_info,
                    public_signals
                ),
                "tokens_used": 0
            }
        
        except Exception as e:
            return {
                "poc_name": poc_name,
                "poc_title": poc_title,
                "message_draft": f"Error generating message: {str(e)}",
                "personalization_level": "error",
                "personalization_notes": [],
                "error": str(e)
            }
    
    def _generate_mock_message(
        self,
        poc_name: str,
        poc_title: str,
        company_name: str,
        tone: str
    ) -> str:
        """Generate a mock message when API key is not available"""
        if tone == "personal":
            return f"Hi {poc_name},\n\nI noticed your work at {company_name} and believe our solution could support your team's goals. Would you be open to a brief conversation?\n\nBest regards"
        else:
            return f"Hi {poc_name},\n\nWe help {company_name}'s {poc_title.lower()} teams improve their workflows with our platform. I'd love to explore if there's a fit.\n\nBest regards"
    
    def _build_message_prompt(
        self,
        poc_name: str,
        poc_title: str,
        company_name: str,
        your_company: str,
        product_type: str,
        public_signals: List[str],
        discovered_personal_info: Optional[Dict[str, Any]],
        tone: str
    ) -> str:
        """Build the prompt for Claude to generate message"""
        
        signals_text = "\n".join(f"- {signal}" for signal in public_signals[:5]) if public_signals else "No specific signals found"
        
        personal_info_text = ""
        if discovered_personal_info:
            if discovered_personal_info.get("recent_news"):
                personal_info_text += f"\nRecent news: {discovered_personal_info['recent_news']}"
            if discovered_personal_info.get("recent_hire"):
                personal_info_text += f"\nRecent hiring: {discovered_personal_info['recent_hire']}"
            if discovered_personal_info.get("linked_article"):
                personal_info_text += f"\nLinked article: {discovered_personal_info['linked_article']}"
        
        # Build context about the recipient's role
        role_context = f"""
Role Context:
- Position: {poc_title} at {company_name}
- Likely responsibilities: Based on their role, {poc_name} likely oversees strategy, decision-making, and team leadership in their area
- Relevance to {product_type}: This solution can help {company_name}'s {poc_title.lower()} achieve better outcomes
"""
        
        tone_instruction = (
            "Write a personal, specific message that references the discovered signals and shows you understand their business context. "
            "Use specific details about their role/company to establish credibility. Focus on a unique hook that makes this relevant to THEIR specific situation."
        ) if tone == "personal" else (
            "Write a professional message that references their role and company context. "
            "Include a specific insight about their industry/role that shows you've done research. "
            "Avoid generic language - make it specific to their situation."
        )
        
        prompt = f"""You are a B2B SaaS sales development representative crafting a highly personalized cold email.

Your goal: Generate a compelling 2-3 sentence opening that hooks {poc_name}'s interest based on their specific role and company context.

About the recipient:
{role_context}

About {company_name}:
{signals_text}

{personal_info_text}

Instructions for the message:
{tone_instruction}

Your message MUST:
1. Start with a specific, relevant insight (2-3 words max) that shows you understand their business context
2. Be 2-3 sentences maximum
3. Reference at least one signal/insight about their role or company
4. End with a soft call-to-action that's easy to respond to
5. Sound natural and conversational - NOT templated
6. Focus on HOW the solution helps THEM specifically
7. Do NOT mention knowing the anchor POC
8. Do NOT use "I noticed", "I came across", or other generic openers

Generate ONLY the message body (no subject line, no greeting, no closing). Make it compelling and specific."""
        
        return prompt
    
    def _extract_signals_used(
        self,
        discovered_personal_info: Optional[Dict[str, Any]],
        public_signals: List[str]
    ) -> List[str]:
        """Extract which signals were used for personalization"""
        signals_used = []
        
        if discovered_personal_info:
            if discovered_personal_info.get("recent_news"):
                signals_used.append("Recent company news")
            if discovered_personal_info.get("recent_hire"):
                signals_used.append("Recent hiring activity")
            if discovered_personal_info.get("linked_article"):
                signals_used.append("Published article/content")
        
        if public_signals:
            signals_used.extend([f"Signal: {s[:50]}..." for s in public_signals[:2]])
        
        return signals_used if signals_used else ["Generic outreach based on role"]
    
    async def generate_multiple_messages(
        self,
        pocs: List[Dict[str, Any]],
        your_company: str,
        product_type: str
    ) -> List[Dict[str, Any]]:
        """Generate messages for multiple POCs"""
        messages = []
        
        for poc in pocs[:5]:  # Limit to top 5
            message = await self.generate_outreach_message(
                poc_name=poc.get("poc_name"),
                poc_title=poc.get("title", "Professional"),
                company_name=poc.get("company_name"),
                your_company=your_company,
                product_type=product_type,
                public_signals=poc.get("public_signals", []),
                discovered_personal_info=None  # Would be populated from news discovery
            )
            messages.append(message)
        
        return messages
