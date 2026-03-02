"""
Signal weights configuration by product type
Default weights that can be adjusted by user
"""

SIGNAL_WEIGHTS_CONFIG = {
    "video_platform": {
        "description": "B2B SaaS video hosting/production platform",
        "default_weights": {
            "content_director_title": 0.95,
            "cmo_title": 0.90,
            "vp_marketing_title": 0.85,
            "director_marketing_title": 0.80,
            "content_manager_title": 0.75,
            "video_hiring_signal": 0.85,
            "content_hiring_signal": 0.80,
            "cco_title": 0.90,
            "communications_director": 0.70,
            "recent_video_news": 0.75,
            "content_strategy_news": 0.70,
            "marketing_expansion_news": 0.65,
            "reporting_to_cmo": 0.80,
            "reporting_to_cfo": 0.40,
        }
    },
    "hr_tool": {
        "description": "HR/People Operations software",
        "default_weights": {
            "chro_title": 0.95,
            "chief_people_officer": 0.95,
            "vp_hr_title": 0.90,
            "director_hr_title": 0.85,
            "director_people_ops": 0.85,
            "hr_hiring_signal": 0.85,
            "talent_hiring_signal": 0.80,
            "hr_expansion_news": 0.80,
            "ceo_title": 0.70,
            "cfo_title": 0.65,
            "reporting_to_ceo": 0.85,
            "reporting_to_cfo": 0.70,
        }
    },
    "analytics_tool": {
        "description": "Data analytics and BI platform",
        "default_weights": {
            "cfo_title": 0.90,
            "vp_finance_title": 0.85,
            "director_finance_title": 0.80,
            "controller_title": 0.80,
            "data_officer_title": 0.85,
            "vp_analytics_title": 0.85,
            "finance_hiring_signal": 0.80,
            "analytics_hiring_signal": 0.80,
            "coo_title": 0.80,
            "reporting_to_cfo": 0.90,
            "reporting_to_ceo": 0.75,
        }
    },
    "sales_enablement": {
        "description": "Sales enablement and training platform",
        "default_weights": {
            "vp_sales_title": 0.95,
            "chief_revenue_officer": 0.95,
            "director_sales_title": 0.85,
            "sales_ops_title": 0.85,
            "sales_enablement_title": 0.90,
            "cro_title": 0.95,
            "sales_hiring_signal": 0.85,
            "sales_expansion_news": 0.80,
            "reporting_to_cro": 0.90,
            "reporting_to_ceo": 0.80,
        }
    },
    "security_compliance": {
        "description": "Cybersecurity and compliance platform",
        "default_weights": {
            "ciso_title": 0.95,
            "chief_security_officer": 0.95,
            "vp_security_title": 0.90,
            "director_security_title": 0.85,
            "compliance_officer": 0.85,
            "chief_risk_officer": 0.85,
            "security_hiring_signal": 0.85,
            "compliance_hiring_signal": 0.80,
            "reporting_to_ceo": 0.85,
        }
    },
}

def get_default_weights(product_type: str) -> dict:
    """Get default weights for product type, with fallback to generic if not found"""
    if product_type in SIGNAL_WEIGHTS_CONFIG:
        return SIGNAL_WEIGHTS_CONFIG[product_type]["default_weights"]
    
    # Return generic weights if product type not found
    return get_generic_weights()

def get_generic_weights() -> dict:
    """Generic weights for unknown product types"""
    return {
        "cxo_title": 0.90,
        "vp_title": 0.80,
        "director_title": 0.70,
        "manager_title": 0.50,
        "hiring_signal": 0.75,
        "recent_news": 0.70,
        "reporting_to_ceo": 0.85,
        "reporting_to_cfo": 0.65,
    }

def get_product_type_description(product_type: str) -> str:
    """Get description of product type"""
    if product_type in SIGNAL_WEIGHTS_CONFIG:
        return SIGNAL_WEIGHTS_CONFIG[product_type]["description"]
    return "Custom product type"
