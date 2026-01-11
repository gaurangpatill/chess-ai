# **Chess AI**

Live Demo:

Interactive chess vs. AI built with React and Vite, powered by a custom minimax engine running entirely in the browser.


## **Overview**

This project is a browser-based chess game where you play as **White** against a **computer-controlled Black**. \
 The AI uses classical chess programming techniques including minimax search, alpha–beta pruning, and a handcrafted evaluation function. The focus of the project is clean architecture, correct game logic, and a minimal, polished UI.


## **Features**


### **Gameplay**



* Human (White) vs Computer (Black)
* Full rule enforcement and legal move generation via `chess.js`
* Move highlighting:
    * Selected square
    * Last move
    * Legal move indicators 



### **AI Engine**



* Custom local chess engine (no backend)
* Minimax search with alpha–beta pruning
* Evaluation function includes:
    * Material values
    * Piece-square tables
    * Mobility bonus
* Move ordering to improve pruning efficiency
* Multiple difficulty levels:
    * **Beginner** – shallow search with randomness
    * **Moderate** – balanced search depth
    * **Advanced** – deeper, deterministic search 



### **Clocks & Game End**



* 5-minute chess clocks for both sides
* Game ends on:
    * Checkmate
    * Draw
    * Timeout
* End-of-game overlay displayed on the board 



### **UI / UX**



* Minimal, retro-inspired design
* Light / Dark theme toggle
* Move list split into White and Black columns
* Captured pieces tracker for both players
* Smooth interactions using Framer Motion 



## **Controls**



* Start / Pause game
* Reset current game
* Difficulty selector
* Theme toggle 



## **Tech Stack**



* React
* Vite
* Tailwind CSS
* Framer Motion
* chess.js
* Custom JavaScript chess engine 



## **Project Structure**

src 
assets – SVG chess pieces 
engine – minimax engine and evaluation logic 
ChessApp.jsx – UI, clocks, and game state 
main.jsx 
index.css


## **Running Locally**

Install dependencies 
 npm install

Run development server 
 npm run dev

Create production build 
 npm run build 
 npm run preview


---


## **Deployment**

This project is designed to be deployed as a static site.

Recommended: **Vercel**



* Build command: `npm run build`
`
* Output directory: `dist`
`


---


## **AI Summary**



1. Generate all legal moves using `chess.js`
`
2. Evaluate positions using material, positional tables, and mobility 

3. Search the game tree with minimax and alpha–beta pruning 

4. Apply difficulty-specific limits (depth, node count, randomness) 

5. Select the best move for Black by minimizing White’s evaluation 
