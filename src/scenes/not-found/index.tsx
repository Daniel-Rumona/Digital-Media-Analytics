import React from 'react'
import {
  Box,
  Button,
  Container,
  Divider,
  Link,
  Paper,
  Stack,
  Typography
} from '@mui/material'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import HomeIcon from '@mui/icons-material/Home'
import LoginIcon from '@mui/icons-material/Login'
import EmailIcon from '@mui/icons-material/Email'
import RefreshIcon from '@mui/icons-material/Refresh'
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred'
import { useNavigate, useLocation } from 'react-router-dom'

type NotFoundProps = {
  /** If true, also show a Login button for anonymous users */
  showLoginLink?: boolean
  /** Optional support email to surface on the page */
  supportEmail?: string // e.g. "support@yourdomain.com"
}

const NotFound: React.FC<NotFoundProps> = ({
  showLoginLink = false,
  supportEmail = 'admin@yourdomain.com'
}) => {
  const navigate = useNavigate()
  const location = useLocation()

  // If someone routed here with an error code or id, we’ll show it.
  // e.g. navigate('/404', { state: { code: 404, requestId: 'abc123' } })
  const errorCode = (location.state as any)?.code ?? 404
  const requestId = (location.state as any)?.requestId

  const goHome = () => navigate('/')
  const goLogin = () => navigate('/login')
  const reload = () => window.location.reload()

  const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(
    '[URGENT] Page not found'
  )}&body=${encodeURIComponent(
    `Hello Admin,\n\nI hit a 404 on: ${window.location.href}\nRequest ID: ${
      requestId ?? 'N/A'
    }\nPlease advise.\n\nThanks.`
  )}`

  return (
    <Container
      maxWidth='md'
      sx={{
        display: 'flex',
        alignItems: 'center',
        minHeight: '100vh',
        py: { xs: 6, md: 10 }
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: '100%',
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            px: { xs: 3, md: 6 },
            py: { xs: 4, md: 6 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            background:
              'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(56,189,248,0.06))'
          }}
        >
          <Stack
            direction='row'
            alignItems='center'
            spacing={1.5}
            sx={{ color: 'text.secondary' }}
          >
            <ReportGmailerrorredIcon color='error' fontSize='large' />
            <Typography
              variant='overline'
              sx={{ letterSpacing: 1.4, fontWeight: 700 }}
            >
              Error {errorCode}
            </Typography>
          </Stack>

          <Typography variant='h3' fontWeight={800}>
            Page not found
          </Typography>

          <Typography variant='body1' color='text.secondary'>
            The page you’re looking for doesn’t exist, moved, or is temporarily
            unavailable.
          </Typography>

          <Box>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ mt: 1 }}
            >
              <Button
                variant='outlined'
                color='secondary'
                startIcon={<SupportAgentIcon />}
                onClick={() => window.open(mailto, '_self')}
              >
                Contact Admin
              </Button>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Container>
  )
}

export default NotFound
