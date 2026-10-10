import type { WebSocket } from 'ws';

export interface CallRecord {
  id: number;
  call_sid: string;
  caller_number: string;
  caller_name: string;
  caller_company?: string;
  caller_email?: string;
  status: string;
  transcript: string;
  intent: string;
  intent_confidence: number;
  summary: string;
  sentiment: string;
  urgency: number;
  priority: string;
  priority_score: number;
  priority_explanation: any;
  follow_up_needed: boolean;
  actions_taken: string[];
  duration_seconds: number;
  created_at: string;
  updated_at?: string;
}

export interface Appointment {
  id: number;
  call_id?: number;
  title: string;
  start_time: string;
  end_time: string;
  attendee_name: string;
  attendee_email: string;
  team: string;
  calendar_event_id: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface FollowUpItem {
  id: number;
  call_id?: number;
  caller_name: string;
  caller_phone: string;
  reason: string;
  priority: string;
  priority_score: number;
  priority_factors: any;
  acknowledged: boolean;
  escalated: boolean;
  created_at: string;
}

export interface HardwareState {
  status: 'AVAILABLE' | 'IN_CALL' | 'CALLBACK_NEEDED' | 'ESCALATED';
  color: 'GREEN' | 'BLUE' | 'AMBER' | 'RED';
  description: string;
  last_action: string;
  acknowledged: boolean;
  escalated: boolean;
  is_hardware_detected: boolean;
  port: string;
}

export interface Lead {
  id: number;
  call_id?: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  intent: string;
  estimated_deal_size: number;
  notes?: string;
  status: string;
  created_at: string;
}

export interface CallSession {
  id: number;
  call_sid: string;
  caller_name: string;
  caller_number: string;
  company: string;
  status: string;
  transcript_turns: Array<{ speaker: string; text: string }>;
  current_entities: Record<string, any>;
  actions_taken: string[];
  start_time: Date;
  intent?: string;
  sentiment?: string;
  urgency?: number;
}

const now = new Date();

// In-memory data store seeded with realistic initial records
export const db = {
  calls: [
    {
      id: 2,
      call_sid: "CA_HIST_02",
      caller_name: "David Sterling",
      caller_number: "+1-212-555-0914",
      caller_company: "Sterling Capital",
      caller_email: "d.sterling@sterlingcap.com",
      status: "completed",
      transcript: "Caller: This is an emergency, our billing reconciliation pipeline threw an authentication timeout and our account seems locked. I need this escalated now! Receptionist: I understand this is critical. I have logged this high-priority escalation and notified our engineering leads immediately.",
      intent: "support_query",
      intent_confidence: 0.96,
      summary: "Emergency billing lockout reported by Sterling Capital. Escalation needed.",
      sentiment: "negative",
      urgency: 0.95,
      priority: "High",
      priority_score: 0.96,
      priority_explanation: {
        model_used: "TabPFN",
        predicted_priority: "High",
        confidence: 0.96,
        factors: [
          { factor: "High Caller Urgency", value: "95%", impact: "+35% on High Priority", direction: "positive" },
          { factor: "Frustrated Sentiment Detected", value: "Negative", impact: "+20% on Escalation Risk", direction: "negative" },
          { factor: "Unresolved Follow-Up Items", value: "Account Lockout", impact: "+25% on Review Priority", direction: "positive" }
        ],
        explanation: "TabPFN classified this call as 'High' priority driven by High Caller Urgency and Negative Sentiment."
      },
      follow_up_needed: true,
      actions_taken: ["Escalation notification dispatched", "Priority Ticket #802 created"],
      duration_seconds: 112,
      created_at: new Date(now.getTime() - 3600000).toISOString()
    },
    {
      id: 1,
      call_sid: "CA_HIST_01",
      caller_name: "Elena Rostova",
      caller_number: "+1-415-555-8921",
      caller_company: "CloudScale Inc",
      caller_email: "elena@cloudscale.io",
      status: "completed",
      transcript: "Caller: I want to schedule a product demo with your enterprise sales representative. Receptionist: Certainly! I have confirmed your appointment for tomorrow at 2:00 PM.",
      intent: "book_meeting",
      intent_confidence: 0.98,
      summary: "Booked enterprise sales demo for CloudScale Inc.",
      sentiment: "positive",
      urgency: 0.6,
      priority: "Medium",
      priority_score: 0.72,
      priority_explanation: {
        explanation: "Medium priority scheduled booking with confirmed calendar slot."
      },
      follow_up_needed: false,
      actions_taken: ["Meeting Booked in Google Calendar", "Confirmation email sent"],
      duration_seconds: 78,
      created_at: new Date(now.getTime() - 10800000).toISOString()
    }
  ] as CallRecord[],

  appointments: [
    {
      id: 1,
      call_id: 1,
      title: "Sales Demo with CloudScale Inc",
      start_time: new Date(now.getTime() + 86400000 + 7200000).toISOString(),
      end_time: new Date(now.getTime() + 86400000 + 9900000).toISOString(),
      attendee_name: "Elena Rostova",
      attendee_email: "elena@cloudscale.io",
      team: "Sales",
      calendar_event_id: "evt_cloudscale_01",
      status: "confirmed",
      notes: "Booked via AI Receptionist. 120 user tier evaluation.",
      created_at: new Date(now.getTime() - 10800000).toISOString()
    },
    {
      id: 2,
      title: "Technical Deep Dive with FinTech Global",
      start_time: new Date(now.getTime() + 172800000 + 14400000).toISOString(),
      end_time: new Date(now.getTime() + 172800000 + 17100000).toISOString(),
      attendee_name: "Marcus Brody",
      attendee_email: "mbrody@fintechglobal.com",
      team: "Engineering",
      calendar_event_id: "evt_fintech_02",
      status: "confirmed",
      notes: "SOC2 compliance and API integration questions.",
      created_at: new Date(now.getTime() - 86400000).toISOString()
    }
  ] as Appointment[],

  leads: [
    {
      id: 1,
      name: "Sarah Connor",
      company: "Cyberdyne Systems",
      email: "s.connor@cyberdyne.com",
      phone: "+1-555-0142",
      intent: "Enterprise Automation",
      estimated_deal_size: 45000.0,
      notes: "Interested in full receptionist deployment across 4 regional branches.",
      status: "New",
      created_at: new Date(now.getTime() - 7200000).toISOString()
    }
  ] as Lead[],

  followUpQueue: [
    {
      id: 1,
      call_id: 2,
      caller_name: "David Sterling",
      caller_phone: "+1-212-555-0914",
      reason: "Priority High: Emergency billing lockout reported by Sterling Capital",
      priority: "High",
      priority_score: 0.96,
      priority_factors: {
        urgency: "95%",
        sentiment: "Negative",
        primary_driver: "Urgent technical account lockout"
      },
      acknowledged: false,
      escalated: false,
      created_at: new Date(now.getTime() - 3600000).toISOString()
    }
  ] as FollowUpItem[],

  hardware: {
    status: 'AVAILABLE',
    color: 'GREEN',
    description: 'System ready. Receptionist available for calls.',
    last_action: 'INITIALIZED',
    acknowledged: false,
    escalated: false,
    is_hardware_detected: false,
    port: 'Virtual UNO Q Port'
  } as HardwareState,

  activeCalls: new Map<string, CallSession>(),
  dashboardClients: new Set<WebSocket>(),

  nextCallId: 3,
  nextAppointmentId: 3,
  nextLeadId: 2,
  nextFollowUpId: 2
};

export function broadcastDashboard(type: string, data: any) {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString()
  });

  const deadClients: WebSocket[] = [];
  for (const client of db.dashboardClients) {
    try {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      } else {
        deadClients.push(client);
      }
    } catch {
      deadClients.push(client);
    }
  }

  for (const dead of deadClients) {
    db.dashboardClients.delete(dead);
  }
}

export function broadcastHardwareState() {
  broadcastDashboard('hardware_update', db.hardware);
}

export function setHardwareState(status: HardwareState['status'], color: HardwareState['color'], description?: string, lastAction?: string) {
  db.hardware.status = status;
  db.hardware.color = color;
  if (lastAction) db.hardware.last_action = lastAction;
  
  if (description) {
    db.hardware.description = description;
  } else {
    switch (status) {
      case 'AVAILABLE':
        db.hardware.description = 'Physical UNO Q indicator: GREEN (Available)';
        break;
      case 'IN_CALL':
        db.hardware.description = 'Physical UNO Q indicator: BLUE (Live call in progress)';
        break;
      case 'CALLBACK_NEEDED':
        db.hardware.description = 'Physical UNO Q indicator: AMBER (Follow-up callback required)';
        break;
      case 'ESCALATED':
        db.hardware.description = 'Physical UNO Q indicator: RED (Escalated follow-up)';
        break;
    }
  }
  
  broadcastHardwareState();
  return db.hardware;
}
