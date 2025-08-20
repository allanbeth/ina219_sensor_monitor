# sensor_monitor/logger.py

import logging
import os

# Shared logger instance
file = "sensor_monitor.log"
logger = logging.getLogger("sensor_monitor")
global max_log_size 
max_log_size = 5 * 1024 * 1024  # Default to 5 MB

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
    else:
        logger.info(f"Log file size: {os.path.getsize(file) / (1024 * 1024):.2f} MB")

def set_log_size(mb):
    global max_log_size
    max_log_size = mb * 1024 * 1024
    logger.info("Log file size set successfully.")
    print(f"Log file size set to {mb} MB.")

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
