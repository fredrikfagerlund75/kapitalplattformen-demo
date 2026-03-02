from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, JSON, Integer, Text
from app.database import Base

class Company(Base):
    """Company research cache"""
    __tablename__ = "companies"
    
    id = Column(String, primary_key=True)  # company_name normalized
    name = Column(String, unique=True, index=True)
    org_data = Column(JSON)  # Cached org structure
    email_patterns = Column(JSON)  # Discovered email patterns
    job_postings = Column(JSON)  # Relevant job postings
    news_signals = Column(JSON)  # News/press signals
    last_updated = Column(DateTime, default=datetime.utcnow)

class POCDiscovery(Base):
    """Discovered points of contact"""
    __tablename__ = "poc_discoveries"
    
    id = Column(Integer, primary_key=True)
    company_name = Column(String, index=True)
    poc_name = Column(String)
    poc_title = Column(String)
    email = Column(String)
    email_confidence = Column(Float)
    email_sources = Column(JSON)  # Which sources verified email
    
    # Scoring components
    title_authority_score = Column(Float)
    product_relevance_score = Column(Float)
    reporting_relevance_score = Column(Float)
    combined_confidence_score = Column(Float)
    
    # Additional data
    reporting_to = Column(String)  # Manager name if found
    public_signals = Column(JSON)  # News, articles, etc.
    is_anchor = Column(Integer, default=0)  # 1 if user-provided anchor
    created_at = Column(DateTime, default=datetime.utcnow)

class OutreachDraft(Base):
    """Generated outreach message drafts"""
    __tablename__ = "outreach_drafts"
    
    id = Column(Integer, primary_key=True)
    poc_discovery_id = Column(Integer)
    company_name = Column(String)
    poc_name = Column(String)
    message_draft = Column(Text)
    personalization_notes = Column(JSON)  # What signals were used
    created_at = Column(DateTime, default=datetime.utcnow)

class SignalWeightConfig(Base):
    """User-configured signal weights by product type"""
    __tablename__ = "signal_weights"
    
    id = Column(Integer, primary_key=True)
    product_type = Column(String, index=True)  # video_platform, hr_tool, analytics, etc.
    signal_name = Column(String)  # e.g., "content_roles", "video_hiring"
    weight = Column(Float)
    is_default = Column(Integer, default=1)  # 1 = default, 0 = user-customized
