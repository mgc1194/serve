"""
transactions/constants.py — System-defined constants for the transactions domain.
"""


class HandlerKeys:
    """
    This class defines canonical handler keys used across the system.
    These identifiers map AccountType records to their
    corresponding account handlers.

    These values are treated as system configuration and are expected
    to be kept in sync with data migrations that seed AccountTypes.
    """
    SOFI_SAVINGS = 'sofi-savings'
    SOFI_CHECKING = 'sofi-checking'
    CO_CHECKING = 'co-checking'
    CO_SAVINGS = 'co-savings'
    CO_QUICKSILVER = 'co-quicksilver'
    AMEX_DELTA = 'amex-delta'
    CHASE = 'chase'
    DISCOVER = 'discover'
    WF_CHECKING = 'wf-checking'
    WF_SAVINGS = 'wf-savings'
