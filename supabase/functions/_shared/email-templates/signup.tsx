/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email — {siteName} 🍝</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={emoji}>🍝</Text>
        <Heading style={h1}>Welcome to the kitchen!</Heading>
        <Text style={text}>
          Thanks for joining{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          — let's measure some spaghetti code together.
        </Text>
        <Text style={text}>
          Please confirm your email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) to fire up the stove:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm my email
        </Button>
        <Text style={footer}>
          If you didn't sign up, no worries — you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: '#DC4126', textDecoration: 'underline' }
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
