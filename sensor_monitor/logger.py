# sensor_monitor/logger.py

import logging
import os

# Shared logger instance
file = "sensor_monitor.log"
logger = logging.getLogger("sensor_monitor")
max_log_size = 1000 * 1024 * 1024  # 1000 MB default

# Configure logger only once
if not logger.handlers:
    handler = logging.FileHandler(file)
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

def _check_log_size():
    if os.path.exists(file) and os.path.getsize(file) > max_log_size:
        with open(file, 'w'): 
            pass  # Clears the file
        logger.info("Log file reset due to size limit.")

def set_log_size(mb):
    global max_log_size
    max_log_size = mb * 1024 * 1024
    info("Log file size set successfully.")

def debug(msg): 
    _check_log_size() 
    logger.debug(msg)

def info(msg): 
    _check_log_size()
    logger.info(msg)

def warning(msg): 
    _check_log_size()
    logger.warning(msg)

def error(msg): 
    _check_log_size()
    logger.error(msg)

def critical(msg): 
    _check_log_size()
    logger.critical(msg)
