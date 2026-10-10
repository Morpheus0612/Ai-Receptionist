export interface GemmaAnalysis {
  intent: 'book_meeting' | 'transfer_call' | 'save_lead' | 'support_query' | 'general_inquiry';
  confidence: number;
  entities: {
    attendee_name: string | null;
    attendee_email: string | null;
    attendee_phone: string | null;
    team: string;
    requested_date: string | null;
    requested_time: string | null;
    purpose: string | null;
  };
  missing_details: string[];
  requires_follow_up: boolean;
  follow_up_question: string | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: number;
  summary: string;
}

export function analyzeUtterance(transcript: string): GemmaAnalysis {
  const textLower = transcript.toLowerCase();

  let intent: GemmaAnalysis['intent'] = 'general_inquiry';
  let confidence = 0.85;

  const entities: GemmaAnalysis['entities'] = {
    attendee_name: null,
    attendee_email: null,
    attendee_phone: null,
    team: 'Sales',
    requested_date: null,
    requested_time: null,
    purpose: null
  };

  const missing_details: string[] = [];
  let requires_follow_up = false;
  let follow_up_question: string | null = null;
  let sentiment: GemmaAnalysis['sentiment'] = 'neutral';
  let urgency = 0.5;
  let summary = 'Caller contacted the reception desk.';

  // Detect email
  const emailMatch = transcript.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    entities.attendee_email = emailMatch[0];
  }

  // Detect phone
  const phoneMatch = transcript.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    entities.attendee_phone = phoneMatch[0];
  }

  // Detect names
  const nameMatch = transcript.match(/(?:my name is|this is|i am|name's)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch) {
    entities.attendee_name = nameMatch[1].replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Detect date references
  const datePatterns = [
    /\b(next\s+(?:tuesday|monday|wednesday|thursday|friday))\b/i,
    /\b(tomorrow|today)\b/i,
    /\b((?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
    /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\b/i
  ];
  for (const pat of datePatterns) {
    const m = textLower.match(pat);
    if (m) {
      entities.requested_date = m[1].replace(/\b\w/g, (c) => c.toUpperCase());
      break;
    }
  }

  // Detect time references
  const timeMatch = textLower.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}\s*o'?clock)\b/i);
  if (timeMatch && (timeMatch[0].includes('am') || timeMatch[0].includes('pm') || timeMatch[0].includes('clock') || timeMatch[0].includes(':'))) {
    entities.requested_time = timeMatch[0];
  }

  // Detect team
  if (textLower.includes('sales')) {
    entities.team = 'Sales';
  } else if (textLower.includes('support') || textLower.includes('technical')) {
    entities.team = 'Technical Support';
  } else if (textLower.includes('billing') || textLower.includes('invoice')) {
    entities.team = 'Billing';
  } else if (textLower.includes('engineering')) {
    entities.team = 'Engineering';
  }

  // Detect urgency and sentiment
  if (['urgent', 'asap', 'immediately', 'emergency', 'critical', 'escalate'].some((w) => textLower.includes(w))) {
    urgency = 0.95;
    sentiment = ['unhappy', 'frustrated', 'broken', 'angry'].some((w) => textLower.includes(w)) ? 'negative' : 'neutral';
  } else if (['thank you', 'great', 'awesome', 'perfect', 'appreciate'].some((w) => textLower.includes(w))) {
    sentiment = 'positive';
    urgency = 0.3;
  }

  // Intent classification
  if (['arrange a meeting', 'book a meeting', 'schedule a call', 'set up a meeting', 'meet with', 'appointment', 'schedule'].some((w) => textLower.includes(w))) {
    intent = 'book_meeting';
    confidence = 0.94;
    entities.purpose = `Meeting with ${entities.team} team regarding inquiry`;

    // Check for missing details
    if (!entities.requested_date) missing_details.push('date');
    if (!entities.requested_time) missing_details.push('time');
    if (!entities.attendee_name) missing_details.push('name');
    if (!entities.attendee_email) missing_details.push('email');

    if (missing_details.length > 0) {
      requires_follow_up = true;
      const missingStr = missing_details.join(', ');
      if (missing_details.includes('time') && entities.requested_date) {
        follow_up_question = `I'd be glad to arrange that meeting with the ${entities.team} team for ${entities.requested_date}! What time works best for you, and could you provide your name and email address?`;
      } else {
        follow_up_question = `I'd be happy to set that up. Could you please specify your preferred ${missingStr}?`;
      }
      summary = `Caller requested meeting with ${entities.team} team on ${entities.requested_date || 'unspecified date'}. Awaiting ${missingStr}.`;
    } else {
      requires_follow_up = false;
      summary = `Caller requested confirmed meeting with ${entities.team} on ${entities.requested_date} at ${entities.requested_time} for ${entities.attendee_name}.`;
    }
  } else if (['transfer me', 'speak to', 'put me through', 'connect me', 'talk with'].some((w) => textLower.includes(w))) {
    intent = 'transfer_call';
    confidence = 0.91;
    summary = `Caller requested live call transfer to ${entities.team} representative.`;
    requires_follow_up = false;
  } else if (['pricing', 'demo', 'interested in purchasing', 'buy', 'quote', 'potential customer'].some((w) => textLower.includes(w))) {
    intent = 'save_lead';
    confidence = 0.88;
    summary = `New commercial prospect inquiring about solutions with ${entities.team} team.`;
  } else if (['issue', 'error', 'not working', 'bug', 'broken', 'complaint', 'help with'].some((w) => textLower.includes(w))) {
    intent = 'support_query';
    confidence = 0.89;
    summary = `Technical support / service issue reported regarding system functionality.`;
  }

  return {
    intent,
    confidence,
    entities,
    missing_details,
    requires_follow_up,
    follow_up_question,
    sentiment,
    urgency,
    summary
  };
}
