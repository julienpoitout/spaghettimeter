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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're invited to {siteName} 🍝</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={emoji}>🍝</Text>
        <Heading style={h1}>A seat at the table</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Accept the invite below to create your account and start cooking.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accept invite
        </Button>
        <Text style={footer}>
          Not expecting this? You can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
