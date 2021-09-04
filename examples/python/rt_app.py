# Owen Gallagher
# 14 June 2021

# imports

import logging
from typing import List, Dict, Any, Union, Optional
import json
import os
import threading

import relational_tags as rt

# module vars

RTAGS_DIR:str = './data'
RTAGS_FILE:str = '{}/rtags.json'.format(RTAGS_DIR)

if __name__ == '__main__':
    logging.basicConfig()
    log = logging.getLogger()
else:
    log = logging.getLogger(__name__)

# methods

def launch_gui() -> 'Gui':
    """Launch GUI (not implemented)
    
    This is a relic of when appjar was attempted to be used as a gui library.
    """
    
    log.debug('launching gui')
    gui = Gui('Relational Tags Test App', '{}x{}'.format(GUI_WIDTH,GUI_HEIGHT))
    
    gui.startFrame("left", row=0, column=0)
    canvas = app.addCanvas('canvas')
    
    gui.stopFrame()
    
    gui.startFrame("right", row=0, column=1)
    
    gui.startFrame("new-tag")
    
    gui.stopFrame()
    
    gui.startFrame("new-entity")
    
    gui.stopFrame()
    
    gui.stopFrame()
    
    gui.go()
    
    return gui
# end launch_gui

def load_rtags():
    if not os.path.exists(RTAGS_DIR):
        log.debug('create rtags file dir {}'.format(RTAGS_DIR))
        os.mkdir(RTAGS_DIR)
    
    if os.path.exists(RTAGS_FILE):
        log.debug('read rtags file {}'.format(RTAGS_FILE))
        
        with open(RTAGS_FILE,'r') as rtags_file:
            tags = rt.load_json(rtags_file.read())
            
            log.debug('loaded tags: \n{}\n'.format('\n'.join([
                str(tag) for tag in tags
            ])))
        # end open file
    
    else:
        log.debug('no rtags file found')
# end load_rtags

def save_rtags():
    if not os.path.exists(RTAGS_DIR):
        log.debug('create rtags file dir {}'.format(RTAGS_DIR))
        os.mkdir(RTAGS_DIR)
    
    with open(RTAGS_FILE,'w') as rtags_file:
        rtags_file.write(rt.save_json())
# end save_rtags

def config():
    log.setLevel(logging.DEBUG)
    
    rt.config(is_case_sensitive=False)
# end config

def main():
    config()
    
    try:
        gui = launch_gui()
    except:
        log.error('skipping gui launch')
    
    load_rtags_t = threading.Thread(target=load_rtags)
    load_rtags_t.start()
# end main
    
if __name__ == '__main__':
    main()
# end if __main__
