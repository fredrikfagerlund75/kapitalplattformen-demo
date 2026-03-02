"""
Ranking and scoring engine
Scores and ranks discovered POCs
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta
import json

class RankingEngine:
    def __init__(self, signal_weights: Dict[str, float]):
        self.weights = signal_weights
    
    def rank_pocs(
        self,
        discovered_pocs: List[Dict[str, Any]],
        email_info: Dict[str, Any],
        news_signals: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Score and rank discovered POCs
        Returns: ranked list with confidence scores and breakdowns
        """
        ranked_pocs = []
        
        for poc in discovered_pocs:
            score = self._calculate_combined_score(
                poc=poc,
                email_info=email_info.get(poc.get("name"), {}),
                news_signals=news_signals
            )
            poc_with_score = {**poc, **score}
            ranked_pocs.append(poc_with_score)
        
        # Sort by combined confidence score (descending)
        ranked_pocs.sort(key=lambda x: x.get("combined_confidence_score", 0), reverse=True)
        
        # Add rank
        for i, poc in enumerate(ranked_pocs, 1):
            poc["rank"] = i
        
        return ranked_pocs
    
    def _calculate_combined_score(
        self,
        poc: Dict[str, Any],
        email_info: Dict[str, Any],
        news_signals: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate 50/50 combined confidence score
        50% = (Title Authority × Product Relevance Weight) + Reporting Chain Relevance
        50% = Email Pattern Confidence
        """
        
        # Calculate role/authority component
        title_authority = self._calculate_title_authority(poc.get("title", ""))
        product_relevance = self._calculate_product_relevance(poc.get("title", ""))
        reporting_relevance = self._calculate_reporting_relevance(poc.get("reporting_to"), poc.get("source"))
        
        role_component = (title_authority * product_relevance) + reporting_relevance
        
        # Get email confidence
        email_confidence = email_info.get("confidence", 0.0) if email_info else 0.0
        
        # Calculate 50/50 split
        combined_score = (0.5 * role_component) + (0.5 * email_confidence)
        combined_score = min(combined_score, 1.0)
        
        # Build score breakdown
        score_breakdown = {
            "title_authority": round(title_authority, 2),
            "product_relevance_weight": round(product_relevance, 2),
            "reporting_relevance": round(reporting_relevance, 2),
            "role_component_50pct": round(0.5 * role_component, 2),
            "email_confidence": round(email_confidence, 2),
            "email_component_50pct": round(0.5 * email_confidence, 2),
            "final_combined_score": round(combined_score, 2),
        }
        
        return {
            "title_authority_score": round(title_authority, 2),
            "product_relevance_score": round(product_relevance, 2),
            "reporting_relevance_score": round(reporting_relevance, 2),
            "email_confidence_score": round(email_confidence, 2),
            "combined_confidence_score": round(combined_score, 2),
            "score_breakdown": score_breakdown,
        }
    
    def _calculate_title_authority(self, title: str) -> float:
        """
        Calculate authority score based on title
        Range: 0.0 - 1.0
        """
        if not title:
            return 0.3
        
        title_lower = title.lower()
        
        # C-level executives
        if any(cxo in title_lower for cxo in ["chief", "ceo", "cfo", "cro", "cto"]):
            return 1.0
        
        # VP level
        if any(vp in title_lower for vp in ["vp ", "vice president", "senior vice president"]):
            return 0.9
        
        # Director level
        if any(dir in title_lower for dir in ["director", "head of"]):
            return 0.8
        
        # Manager level
        if any(mgr in title_lower for mgr in ["manager", "lead"]):
            return 0.6
        
        # Specialist/coordinator
        if any(spec in title_lower for spec in ["specialist", "coordinator", "associate"]):
            return 0.4
        
        return 0.5
    
    def _calculate_product_relevance(self, title: str) -> float:
        """
        Calculate product relevance based on signal weights
        Uses weights configured for product type
        """
        if not title or not self.weights:
            return 0.5
        
        title_lower = title.lower()
        max_weight = 0.5  # Default if no matches
        
        for signal_name, weight in self.weights.items():
            # Check if any signal keywords match title
            if self._signal_matches_title(signal_name, title_lower):
                max_weight = max(max_weight, weight)
        
        return max_weight
    
    def _signal_matches_title(self, signal: str, title: str) -> bool:
        """Check if signal keyword matches title"""
        # Map signal names to keywords
        signal_keywords = {
            "content_director_title": ["director of content", "content director", "head of content"],
            "cmo_title": ["cmo", "chief marketing officer"],
            "vp_marketing_title": ["vp of marketing", "vp marketing", "vice president of marketing"],
            "director_marketing_title": ["director of marketing", "marketing director"],
            "content_manager_title": ["content manager", "manager of content"],
            "video_hiring_signal": ["video", "video editor", "video producer"],
            "content_hiring_signal": ["content", "writer", "copywriter"],
            "cco_title": ["cco", "chief content officer"],
            "communications_director": ["director of communications", "communications director"],
            "chro_title": ["chro", "chief human resources", "chief people officer"],
            "vp_hr_title": ["vp of hr", "vp hr", "vp of people"],
            "director_hr_title": ["director of hr", "director of people"],
            "cfo_title": ["cfo", "chief financial officer"],
            "vp_finance_title": ["vp of finance", "vp finance"],
            "cro_title": ["cro", "chief revenue officer"],
            "vp_sales_title": ["vp of sales", "vp sales"],
            "director_sales_title": ["director of sales", "sales director"],
        }
        
        keywords = signal_keywords.get(signal, [])
        return any(keyword in title for keyword in keywords)
    
    def _calculate_reporting_relevance(self, reporting_to: str, source: str) -> float:
        """
        Calculate relevance based on reporting structure
        Direct reports to C-suite/VP = higher relevance
        """
        if not reporting_to:
            return 0.0
        
        reporting_lower = reporting_to.lower()
        
        # Reports to CEO/C-suite
        if any(cxo in reporting_lower for cxo in ["chief", "ceo", "cfo", "cro"]):
            return 0.4
        
        # Reports to VP
        if "vp " in reporting_lower or "vice president" in reporting_lower:
            return 0.3
        
        # Reports to Director
        if "director" in reporting_lower:
            return 0.15
        
        return 0.1
    
    def get_score_explanation(self, poc: Dict[str, Any]) -> str:
        """Generate human-readable explanation of score"""
        breakdown = poc.get("score_breakdown", {})
        
        explanation = f"""
Score Breakdown for {poc.get('poc_name', 'Unknown')}:

Role & Authority Component (50%):
  - Title Authority: {breakdown.get('title_authority', 0.0)}/1.0
  - Product Relevance Weight: {breakdown.get('product_relevance_weight', 0.0)}/1.0
  - Reporting Relevance: {breakdown.get('reporting_relevance', 0.0)}/1.0
  - Subtotal: {breakdown.get('role_component_50pct', 0.0)}/1.0

Email Pattern Component (50%):
  - Email Confidence: {breakdown.get('email_confidence', 0.0)}/1.0
  - Subtotal: {breakdown.get('email_component_50pct', 0.0)}/1.0

FINAL COMBINED SCORE: {breakdown.get('final_combined_score', 0.0)}/1.0
        """
        return explanation.strip()
