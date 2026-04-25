/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link — {siteName} 🍝</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={emoji}>✨</Text>
        <Heading style={h1}>Your magic link</Heading>
        <Text style={text}>
          Click below to sign in to {siteName}. The link expires shortly, so
          don't let it go cold.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Sign in to {siteName}
        </Button>
        <Text style={footer}>
          Didn't request this? You can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', Arial, sans-serif",
  padding: '24px 0',
}
const container = {
  padding: '32px 28px',
  maxWidth: '520px',
  backgroundColor: '#FBF3E5',
  borderRadius: '16px',
  border: '1px solid #E8DCC4',
}
const emoji = { fontSize: '40px', margin: '0 0 8px' }
const h1 = {
  fontFamily: "'Fredoka', 'Arial Black', sans-serif",
  fontSize: '26px',
  fontWeight: 'bold' as const,
  color: '#3D2817',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#5C4534',
  lineHeight: '1.6',
  margin: '0 0 22px',
}
const button = {
  backgroundColor: '#DC4126',
  color: '#FBF3E5',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
}
const footer = {
  fontSize: '12px',
  color: '#8A7560',
  margin: '30px 0 0',
  lineHeight: '1.5',
}
