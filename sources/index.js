import './i18n-zh.js'
import './threejs-override.js'
import { Game } from './Game/Game.js'
import consoleLog from './data/consoleLog.js'

document.title = 'HC 的作品集'

const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
if(appTitle)
    appTitle.setAttribute('content', 'HC 的作品集')

if(import.meta.env.VITE_LOG)
    console.log(
        ...consoleLog
    )

if(import.meta.env.VITE_GAME_PUBLIC)
    window.game = new Game()
else
    new Game()
