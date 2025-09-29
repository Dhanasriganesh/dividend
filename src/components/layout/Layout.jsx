import React from 'react'
import Header from '../header/Header'
import Footer from '../footer/Footer'
import Routers from '../routers/Routers'
import { BrowserRouter as Router } from 'react-router-dom'
function Layout() {
  return (
    <Router>
        <Header/>
        <Routers/>
        <Footer/>
    </Router>
  )
}

export default Layout