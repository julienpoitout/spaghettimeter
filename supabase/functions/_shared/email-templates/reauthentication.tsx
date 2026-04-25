/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code 🍝</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={emoji}>🔐</Text>
        <Heading style={h1}>Confirm it's you</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. If you didn't request it, you can safely
          ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#DC4126',
  letterSpacing: '4px',
  margin: '0 0 30px',
}
const footer = {
  fontSize: '12px',
  color: '#8A7560',
  margin: '30px 0 0',
  lineHeight: '1.5',
}
