# Owen Gallagher
# 13 June 2021

import logging
from typing import Dict

STR_TO_LOG_LEVEL:Dict[str,int] = {
    'debug': logging.DEBUG,
    'info': logging.INFO,
    'warning': logging.WARNING,
    'error': logging.ERROR,
    'critical': logging.CRITICAL
}
