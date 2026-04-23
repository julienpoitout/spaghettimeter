/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SpaghettiMeter'

interface FeedbackNotificationProps {
  name?: string
  email?: string
  message?: string
  submittedAt?: string
}

const FeedbackNotificationEmail = ({
  name,
  email,
  message,
  submittedAt,
}: FeedbackNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🍝 New feedback from {name || 'a SpaghettiMeter user'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🍝 New Feedback Received</Heading>
        <Text style={text}>
          Someone just left feedback on {SITE_NAME}. Here are the details:
        </Text>

        <Section style={card}>
          <Text style={label}>From</Text>
          <Text style={value}>{name || 'Anonymous'}</Text>

          <Hr style={divider} />

          <Text style={label}>Email</Text>
          <Text style={value}>{email || 'Not provided'}</Text>

          <Hr style={divider} />

          <Text style={label}>Message</Text>
          <Text style={messageBlock}>{message || '(no message)'}</Text>

          {submittedAt ? (
            <>
              <Hr style={divider} />
              <Text style={label}>Submitted at</Text>
              <Text style={value}>{submittedAt}</Text>
            </>
          ) : null}
        </Section>

        <Text style={footer}>
          Buon appetito! — The {SITE_NAME} kitchen 🍝
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FeedbackNotificationEmail,
  subject: (data: Record<string, any>) =>
    `🍝 New SpaghettiMeter feedback from ${data?.name || 'a user'}`,
  displayName: 'Feedback notification',
  previewData: {
    name: 'Mario Rossi',
    email: 'mario@example.com',
    message: 'Love the app! The pasta-themed scoring made me smile.',
    submittedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Fredoka, "Helvetica Neue", Arial, sans-serif',
}
const container = {
  padding: '24px 28px',
  maxWidth: '560px',
  margin: '0 auto',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: 'hsl(20, 30%, 15%)',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: 'hsl(20, 15%, 45%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const card = {
  backgroundColor: 'hsl(35, 40%, 93%)',
  borderRadius: '16px',
  padding: '20px 24px',
  border: '1px solid hsl(30, 20%, 82%)',
}
const label = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  color: 'hsl(8, 75%, 52%)',
  margin: '0 0 4px',
}
const value = {
  fontSize: '15px',
  color: 'hsl(20, 30%, 15%)',
  margin: '0',
  lineHeight: '1.5',
}
const messageBlock = {
  fontSize: '15px',
  color: 'hsl(20, 30%, 15%)',
  margin: '0',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
}
const divider = {
  borderColor: 'hsl(30, 20%, 82%)',
  margin: '14px 0',
}
const footer = {
  fontSize: '13px',
  color: 'hsl(20, 15%, 45%)',
  margin: '24px 0 0',
  textAlign: 'center' as const,
}