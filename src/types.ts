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
