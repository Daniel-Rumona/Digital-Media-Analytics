import React from 'react'
import { ColorModeContext, useMode } from './theme'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { Routes, Route } from 'react-router-dom'
import NotFound from './scenes/not-found'

function App () {
  const [theme, colorMode] = useMode()

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          {/* Every route goes to 404 */}
          <Route path='*' element={<NotFound />} />
        </Routes>
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}

export default App
