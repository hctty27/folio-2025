import './i18n-zh.js'
import './threejs-override.js'
import { Game } from './Game/Game.js'
import consoleLog from './data/consoleLog.js'

const applyChengBranding = () =>
{
    document.title = "Cheng's"

    const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if(appTitle)
        appTitle.setAttribute('content', "Cheng's")

    const homeTitle = document.querySelector('.home-content .title')
    if(homeTitle)
        homeTitle.textContent = "Cheng's Home"
}

if(document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', applyChengBranding, { once: true })
else
    applyChengBranding()

if(import.meta.env.VITE_LOG)
    console.log(
        ...consoleLog
    )

if(import.meta.env.VITE_GAME_PUBLIC)
    window.game = new Game()
else
    new Game()
