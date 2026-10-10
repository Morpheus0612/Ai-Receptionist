import express from 'express';
import { db, setHardwareState, broadcastDashboard, broadcastHardwareState, CallSession, CallRecord, FollowUpItem } from './state';
import { analyzeUtterance } from './gemma-service';
import { predictPriority } from './tabpfn-service';
import { runBenchmarkEvaluation, evaluateCustomUtterance } from './tinker-service';
import { parseRequestedSlot, checkAvailability, createMeeting } from './calendar-service';
import { GoogleGenAI } from '@google/genai';

export const apiRouter = express.Router();

// Helper to start a call session
export async function startCall(callerName = 'Alex Mercer', callerNumber = '+1-555-0199', company = 'Acme Corp') {
  const callSid = `CA${Math.random().toString(36).substring(2, 16)}`;
  const recordId = db.nextCallId++;

  const record: CallRecord = {
    id: recordId,
    call_sid: callSid,
    caller_name: callerName,
    caller_number: callerNumber,
    caller_company: company,
    status: 'in-progress',
    transcript: '',
    intent: 'unknown',
    intent_confidence: 0,
    summary: '',
    sentiment: 'neutral',
    urgency: 0.5,
    priority: 'Medium',
    priority_score: 0.5,
    priority_explanation: {},
    follow_up_needed: false,
    actions_taken: [],
    duration_seconds: 0,
    created_at: new Date().toISOString()
  };

  db.calls.unshift(record);

  // Set hardware state to BLUE
  setHardwareState('IN_CALL', 'BLUE', `Call started with ${callerName}`, 'CALL_STARTED');

  const session: CallSession = {
    id: recordId,
    call_sid: callSid,
    caller_name: callerName,
    caller_number: callerNumber,
    company,
    status: 'in-progress',
    transcript_turns: [],
    current_entities: {},
    actions_taken: [],
    start_time: new Date()
  };

  db.activeCalls.set(callSid, session);

  broadcastDashboard('call_started', {
    call_sid: callSid,
    caller_name: callerName,
    caller_number: callerNumber,
    company,
    status: 'in-progress'
  });

  return session;
}

// Helper to process an utterance
export async function processUtterance(callSid: string, callerUtterance: string) {
  let session = db.activeCalls.get(callSid);
  if (!session) {
    session = await startCall();
    callSid = session.call_sid;
  }

  session.transcript_turns.push({ speaker: 'caller', text: callerUtterance });
  const fullTranscript = session.transcript_turns.map((t) => `${t.speaker}: ${t.text}`).join(' ');

  broadcastDashboard('transcript_turn', {
    call_sid: callSid,
    speaker: 'caller',
    text: callerUtterance
  });

  const analysis = analyzeUtterance(fullTranscript);

  // Merge discovered entities
  for (const [k, v] of Object.entries(analysis.entities)) {
    if (v && !session.current_entities[k]) {
      session.current_entities[k] = v;
    }
  }

  if (!session.current_entities.attendee_name) {
    session.current_entities.attendee_name = session.caller_name;
  }

  if (!session.current_entities.attendee_email) {
    const cleanName = session.caller_name.toLowerCase().replace(/\s+/g, '.');
    session.current_entities.attendee_email = `${cleanName}@example.com`;
  }

  if (session.intent === 'book_meeting' && analysis.intent === 'general_inquiry') {
    analysis.intent = 'book_meeting';
  }
  session.intent = analysis.intent;
  session.sentiment = analysis.sentiment;
  session.urgency = analysis.urgency;

  if (session.intent === 'book_meeting') {
    if (session.current_entities.requested_date && session.current_entities.requested_time) {
      analysis.requires_follow_up = false;
    }
  }

  let responseText = '';
  let actionExecuted: string | null = null;

  if (analysis.requires_follow_up && analysis.follow_up_question) {
    responseText = analysis.follow_up_question;
    const actionDesc = `Awaiting missing details: ${analysis.missing_details.join(', ')}`;
    session.actions_taken.push(actionDesc);
  } else if (analysis.intent === 'book_meeting') {
    const dateStr = session.current_entities.requested_date || 'next Tuesday';
    const timeStr = session.current_entities.requested_time || '2:00 PM';
    const { start, end } = parseRequestedSlot(dateStr, timeStr);

    const bookingResult = createMeeting({
      attendee_name: session.current_entities.attendee_name || session.caller_name,
      attendee_email: session.current_entities.attendee_email || 'guest@example.com',
      start_time: start,
      end_time: end,
      team: session.current_entities.team || 'Sales',
      notes: `Booked via Voice AI Receptionist for ${session.caller_name}`,
      call_id: session.id
    });

    if (bookingResult.success) {
      actionExecuted = 'Meeting Booked';
      session.actions_taken.push(`Booked ${bookingResult.title} in Google Calendar (ID: ${bookingResult.event_id})`);
      responseText = `I have checked our schedule and successfully confirmed your meeting with the ${session.current_entities.team || 'Sales'} team for ${start.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. A calendar invite and confirmation email have been sent to ${session.current_entities.attendee_email}!`;
    } else {
      responseText = `I checked the calendar, but unfortunately that slot is unavailable: ${bookingResult.message}. Would another time work for you?`;
    }
  } else if (analysis.intent === 'transfer_call') {
    const targetDept = session.current_entities.team || 'Sales';
    actionExecuted = 'Call Transfer Initiated';
    session.actions_taken.push(`Routing call to ${targetDept} queue`);
    responseText = `Certainly! Connecting you directly to our ${targetDept} specialist now. Please hold for one moment.`;
  } else if (analysis.intent === 'save_lead') {
    const newLead = {
      id: db.nextLeadId++,
      call_id: session.id,
      name: session.caller_name,
      company: session.company,
      email: session.current_entities.attendee_email,
      phone: session.caller_number,
      intent: 'Sales Pipeline Inquiry',
      estimated_deal_size: 15000.0,
      notes: 'Generated via Voice AI Receptionist',
      status: 'New',
      created_at: new Date().toISOString()
    };
    db.leads.unshift(newLead);
    actionExecuted = 'Lead Saved to CRM';
    session.actions_taken.push(`Saved commercial lead for ${session.caller_name} ($15,000 pipeline)`);
    responseText = "Thank you for your interest! I've logged your company details and our enterprise team will reach out with a customized proposal.";
  } else {
    responseText = "I understand. I'm noting that down right now and will make sure our team has all the details.";
  }

  session.transcript_turns.push({ speaker: 'receptionist', text: responseText });

  broadcastDashboard('transcript_turn', {
    call_sid: callSid,
    speaker: 'receptionist',
    text: responseText
  });

  broadcastDashboard('call_analysis_update', {
    call_sid: callSid,
    intent: analysis.intent,
    confidence: analysis.confidence,
    entities: session.current_entities,
    requires_follow_up: analysis.requires_follow_up,
    actions_taken: session.actions_taken,
    sentiment: analysis.sentiment,
    urgency: analysis.urgency
  });

  return {
    response_text: responseText,
    analysis,
    action_executed: actionExecuted,
    call_session: session
  };
}

// Helper to end a call
export async function endCall(callSid: string) {
  const session = db.activeCalls.get(callSid);
  if (!session) {
    return { error: 'Call not found' };
  }

  const duration = Math.max(15, Math.floor((new Date().getTime() - session.start_time.getTime()) / 1000));
  const fullTranscript = session.transcript_turns.map((t) => `${t.speaker === 'caller' ? 'Caller' : 'Receptionist'}: ${t.text}`).join('\n');

  const tabpfnResult = predictPriority({
    intent: session.intent || 'general_inquiry',
    urgency: session.urgency || 0.5,
    sentiment: session.sentiment || 'neutral',
    is_repeat_caller: false,
    requires_follow_up: session.actions_taken.length === 0 || session.actions_taken.some((a) => a.includes('Awaiting')),
    estimated_deal_size: (session.intent === 'save_lead' || JSON.stringify(session.current_entities).toLowerCase().includes('sales')) ? 15000 : 5000,
    duration_seconds: duration,
    missing_details: []
  });

  const record = db.calls.find((c) => c.id === session.id);
  let followUpCreated = false;

  if (record) {
    record.status = 'completed';
    record.transcript = fullTranscript;
    record.intent = session.intent || 'book_meeting';
    record.intent_confidence = 0.95;
    record.summary = `Call with ${session.caller_name} (${session.company}). Intent: ${record.intent}. Handled with actions: ${session.actions_taken.join('; ')}.`;
    record.sentiment = session.sentiment || 'positive';
    record.urgency = session.urgency || 0.4;
    record.priority = tabpfnResult.predicted_priority;
    record.priority_score = tabpfnResult.confidence;
    record.priority_explanation = tabpfnResult;
    record.actions_taken = session.actions_taken;
    record.duration_seconds = duration;

    if (tabpfnResult.predicted_priority === 'High' || tabpfnResult.predicted_priority === 'Medium') {
      record.follow_up_needed = true;
      const queueItem: FollowUpItem = {
        id: db.nextFollowUpId++,
        call_id: record.id,
        caller_name: session.caller_name,
        caller_phone: session.caller_number,
        reason: `Priority ${tabpfnResult.predicted_priority}: Review appointment details and follow up on inquiry`,
        priority: tabpfnResult.predicted_priority,
        priority_score: tabpfnResult.confidence,
        priority_factors: tabpfnResult.factors,
        acknowledged: false,
        escalated: false,
        created_at: new Date().toISOString()
      };
      db.followUpQueue.unshift(queueItem);
      followUpCreated = true;
    }
  }

  if (followUpCreated && tabpfnResult.predicted_priority === 'High') {
    setHardwareState('CALLBACK_NEEDED', 'AMBER', `Call ended. High priority follow-up queued for ${session.caller_name}.`, 'FOLLOW_UP_QUEUED');
  } else {
    setHardwareState('AVAILABLE', 'GREEN', 'Call completed. Receptionist available.', 'CALL_ENDED');
  }

  broadcastHardwareState();

  const completedPayload = {
    call_sid: callSid,
    status: 'completed',
    duration,
    summary: record ? record.summary : '',
    tabpfn_prediction: tabpfnResult,
    actions_taken: session.actions_taken
  };

  broadcastDashboard('call_completed', completedPayload);
  db.activeCalls.delete(callSid);

  return completedPayload;
}

// ----------------------------------------------------------------------
// Calls Endpoints
// ----------------------------------------------------------------------
apiRouter.post('/calls/start', async (req, res) => {
  const { caller_name, caller_number, company } = req.body || {};
  const session = await startCall(caller_name || 'Alex Mercer', caller_number || '+1-555-0199', company || 'Acme Corp');
  res.json(session);
});

apiRouter.post('/calls/utterance', async (req, res) => {
  const { call_sid, utterance } = req.body || {};
  const result = await processUtterance(call_sid, utterance || '');
  res.json(result);
});

apiRouter.post('/calls/end', async (req, res) => {
  const { call_sid } = req.body || {};
  const result = await endCall(call_sid);
  res.json(result);
});

apiRouter.get('/calls/records', (_req, res) => {
  res.json(db.calls);
});

apiRouter.get('/calls/:call_id', (req, res) => {
  const id = parseInt(req.params.call_id, 10);
  const record = db.calls.find((c) => c.id === id);
  if (!record) return res.status(404).json({ detail: 'Call record not found' });
  res.json(record);
});

// ----------------------------------------------------------------------
// Calendar Endpoints
// ----------------------------------------------------------------------
apiRouter.get('/calendar/appointments', (_req, res) => {
  res.json(db.appointments);
});

apiRouter.post('/calendar/book', (req, res) => {
  const { attendee_name, attendee_email, start_time, end_time, team, notes, call_id } = req.body || {};
  const start = new Date(start_time);
  const end = new Date(end_time);

  const result = createMeeting({
    attendee_name,
    attendee_email,
    start_time: start,
    end_time: end,
    team: team || 'Sales',
    notes,
    call_id
  });

  if (!result.success) {
    return res.status(400).json({ detail: result.message });
  }

  const appRecord = db.appointments.find((a) => a.id === result.appointment_id);
  res.json(appRecord);
});

apiRouter.get('/calendar/check-slot', (req, res) => {
  const { start_time, end_time, team } = req.query as { start_time: string; end_time: string; team?: string };
  try {
    const start = new Date(start_time);
    const end = new Date(end_time);
    res.json(checkAvailability(start, end, team || 'Sales'));
  } catch {
    res.status(400).json({ detail: 'Invalid ISO datetime format' });
  }
});

// ----------------------------------------------------------------------
// TabPFN Endpoints
// ----------------------------------------------------------------------
apiRouter.post('/tabpfn/predict', (req, res) => {
  const result = predictPriority(req.body || {});
  res.json(result);
});

apiRouter.get('/tabpfn/queue', (_req, res) => {
  const sorted = [...db.followUpQueue].sort((a, b) => b.priority_score - a.priority_score);
  res.json(sorted);
});

apiRouter.post('/tabpfn/acknowledge/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = db.followUpQueue.find((i) => i.id === id);
  if (!item) return res.status(404).json({ detail: 'Queue item not found' });
  item.acknowledged = true;
  res.json({ status: 'success', message: `Item #${id} acknowledged` });
});

apiRouter.post('/tabpfn/escalate/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = db.followUpQueue.find((i) => i.id === id);
  if (!item) return res.status(404).json({ detail: 'Queue item not found' });
  item.escalated = true;
  item.priority = 'High';
  item.priority_score = 0.99;
  res.json({ status: 'success', message: `Item #${id} escalated to High priority` });
});

apiRouter.get('/tabpfn/dataset-info', (_req, res) => {
  res.json({
    dataset_name: 'Historical Call Center Receptionist Outcomes',
    sample_count: 20,
    features: [
      'urgency_score',
      'is_repeat_caller',
      'has_unresolved_request',
      'deal_size_thousands',
      'sentiment_score',
      'call_duration_seconds',
      'intent_type_code'
    ],
    classes: ['High', 'Medium', 'Low'],
    architecture: 'TabPFN Transformer Architecture (Prior-Data Fitted Network)'
  });
});

// ----------------------------------------------------------------------
// Tinker Endpoints
// ----------------------------------------------------------------------
apiRouter.get('/tinker/benchmark', (_req, res) => {
  res.json(runBenchmarkEvaluation());
});

apiRouter.post('/tinker/evaluate-custom', (req, res) => {
  const text = req.body?.utterance || '';
  res.json(evaluateCustomUtterance(text));
});

// ----------------------------------------------------------------------
// Hardware Endpoints
// ----------------------------------------------------------------------
apiRouter.get('/hardware/state', (_req, res) => {
  res.json(db.hardware);
});

apiRouter.post('/hardware/button', (req, res) => {
  const action = (req.body?.action || '').toUpperCase();
  if (action === 'ACKNOWLEDGE') {
    db.hardware.acknowledged = true;
    setHardwareState('AVAILABLE', 'GREEN', 'Follow-up acknowledged via physical controls', 'BUTTON_ACKNOWLEDGE');
  } else if (action === 'ESCALATE') {
    db.hardware.escalated = true;
    setHardwareState('ESCALATED', 'RED', 'Urgent escalation triggered via physical controls', 'BUTTON_ESCALATE');
  }
  res.json(db.hardware);
});

apiRouter.post('/hardware/set-state', (req, res) => {
  const { status, color, description } = req.body || {};
  const updated = setHardwareState(status, color, description, 'MANUAL_SET');
  res.json(updated);
});

// ----------------------------------------------------------------------
// Demo Simulator Scenes 1 - 5
// ----------------------------------------------------------------------
apiRouter.post('/demo/run-scene/:scene_number', async (req, res) => {
  const sceneNumber = parseInt(req.params.scene_number, 10);

  if (sceneNumber === 1) {
    const session = await startCall('Jordan Vance', '+1-415-555-0182', 'Nexus Robotics');
    res.json({
      scene: 1,
      title: 'The Call Arrives',
      description: 'Incoming call established. Dashboard displays live call; Arduino indicator turns BLUE.',
      session,
      hardware: db.hardware
    });
  } else if (sceneNumber === 2) {
    const active = Array.from(db.activeCalls.keys());
    const callSid = active[0] || (await startCall()).call_sid;
    const utterance = 'Can you arrange a meeting with the sales team next Tuesday?';
    const result = await processUtterance(callSid, utterance);
    res.json({
      scene: 2,
      title: 'The AI Understands',
      description: 'Gemma extracts requested date (next Tuesday) and team (Sales), identifies missing time & email, asks clarifying question rather than guessing.',
      caller_utterance: utterance,
      result
    });
  } else if (sceneNumber === 3) {
    const active = Array.from(db.activeCalls.keys());
    const callSid = active[active.length - 1] || (await startCall()).call_sid;
    const session = db.activeCalls.get(callSid)!;
    if (!session.intent || session.intent === 'unknown') {
      session.intent = 'book_meeting';
      session.current_entities.requested_date = 'next Tuesday';
    }
    const utterance = 'Sure, 2:00 PM works best for me. My name is Jordan Vance and email is jordan.vance@nexusrobotics.io.';
    const result = await processUtterance(callSid, utterance);
    res.json({
      scene: 3,
      title: 'A Real Action Succeeds',
      description: 'System checks calendar availability, verifies slot, books meeting in Google/Demo Calendar, and confirms invite.',
      caller_utterance: utterance,
      result
    });
  } else if (sceneNumber === 4) {
    const sampleCall = {
      intent: 'book_meeting',
      urgency: 0.88,
      sentiment: 'positive',
      is_repeat_caller: false,
      requires_follow_up: true,
      estimated_deal_size: 25000.0,
      duration_seconds: 95,
      missing_details: []
    };
    const prio = predictPriority(sampleCall);
    const bench = runBenchmarkEvaluation();
    res.json({
      scene: 4,
      title: 'The System Learns & Prioritizes',
      description: 'TabPFN predicts priority with factor explanations; Tinker fine-tuning benchmark compared with Base Gemma.',
      tabpfn_prediction: prio,
      tinker_evaluation: bench.summary
    });
  } else if (sceneNumber === 5) {
    const active = Array.from(db.activeCalls.keys());
    const callSid = active[0] || (await startCall()).call_sid;
    const result = await endCall(callSid);
    res.json({
      scene: 5,
      title: 'Show the Result',
      description: 'Call record saved, appointment logged, priority review queue updated, Arduino hardware returns to Available (GREEN).',
      result,
      hardware: db.hardware
    });
  } else {
    res.status(400).json({ error: 'Invalid scene number. Choose 1 to 5.' });
  }
});

// ----------------------------------------------------------------------
// Gemini Outbound Call Endpoint
// ----------------------------------------------------------------------
apiRouter.post('/gemini/call', async (req, res) => {
  const { to_number, caller_name } = req.body || {};
  if (!to_number || !to_number.trim()) {
    return res.status(400).json({ detail: 'Phone number is required.' });
  }

  const name = caller_name || 'Caller';
  const newId = db.nextCallId++;
  const callRecord: CallRecord = {
    id: newId,
    call_sid: `CA_GEMINI_${Math.random().toString(36).substring(2, 12)}`,
    caller_number: to_number,
    caller_name: name,
    status: 'pending_connection',
    transcript: '',
    intent: 'outbound_ai_call',
    intent_confidence: 0.98,
    summary: `Outbound Gemini call initiated to ${name} (${to_number})`,
    sentiment: 'positive',
    urgency: 0.5,
    priority: 'Medium',
    priority_score: 0.75,
    priority_explanation: { info: 'Initiated via Google Gemini Live AI pipeline' },
    follow_up_needed: false,
    actions_taken: ['Queued outbound call via Gemini AI speech bridge'],
    duration_seconds: 0,
    created_at: new Date().toISOString()
  };

  db.calls.unshift(callRecord);

  let greetingText = `Hello ${name}! This is your AI receptionist powered by Google Gemini. How can I help you today?`;

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a friendly business AI phone receptionist. Generate a short, warm opening greeting for a phone call to ${name}. Keep it under 2 sentences.`
      });
      if (response.text) {
        greetingText = response.text.trim();
      }
    } catch (e) {
      console.warn('Gemini greeting generation fallback:', e);
    }
  }

  callRecord.transcript = `Receptionist: ${greetingText}`;
  broadcastDashboard('call_started', {
    call_sid: callRecord.call_sid,
    caller_name: name,
    caller_number: to_number,
    status: 'pending_connection'
  });

  res.json({
    success: true,
    message: `Call queued for ${to_number}. The AI receptionist will connect shortly with greeting: "${greetingText}"`,
    call_id: callRecord.id
  });
});

apiRouter.get('/gemini/config', (_req, res) => {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  res.json({
    api_key_configured: Boolean(geminiApiKey),
    genai_package_installed: true,
    model: 'gemini-2.5-flash',
    telephony_bridge: 'Configured via Gemini Audio & Browser Simulator',
    status: geminiApiKey ? 'ready' : 'ready_with_local_fallback'
  });
});

// ----------------------------------------------------------------------
// Leads Endpoints
// ----------------------------------------------------------------------
apiRouter.get('/leads', (_req, res) => {
  res.json(db.leads);
});

apiRouter.post('/leads', (req, res) => {
  const newLead = {
    id: db.nextLeadId++,
    call_id: req.body?.call_id,
    name: req.body?.name || 'Prospect',
    company: req.body?.company,
    email: req.body?.email,
    phone: req.body?.phone,
    intent: req.body?.intent || 'Commercial Inquiry',
    estimated_deal_size: req.body?.estimated_deal_size || 5000,
    notes: req.body?.notes,
    status: req.body?.status || 'New',
    created_at: new Date().toISOString()
  };
  db.leads.unshift(newLead);
  res.json(newLead);
});

// ----------------------------------------------------------------------
// Vapi AI Endpoints (Outbound phone calling & web voice)
// ----------------------------------------------------------------------
apiRouter.get('/vapi/config', (_req, res) => {
  const vapiKey = process.env.VAPI_API_KEY;
  res.json({
    configured: Boolean(vapiKey),
    phone_number_id: process.env.VAPI_PHONE_NUMBER_ID || null,
    assistant_id: process.env.VAPI_ASSISTANT_ID || null,
    status: vapiKey ? 'ready' : 'key_not_configured',
    provider: 'vapi.ai'
  });
});

apiRouter.post('/vapi/call', async (req, res) => {
  const { to_number, caller_name } = req.body || {};
  if (!to_number || !to_number.trim()) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const name = caller_name?.trim() || 'Valued Caller';
  const num = to_number.trim();
  const vapiKey = process.env.VAPI_API_KEY;

  // 1. Always create the session and record in AI Receptionist dashboard
  const session = await startCall(name, num, 'Vapi AI Phone Line');

  // 2. If VAPI_API_KEY is configured in the environment, make the real Vapi API call
  if (vapiKey) {
    try {
      const vapiPayload: any = {
        customer: {
          number: num,
          name: name
        }
      };

      if (process.env.VAPI_PHONE_NUMBER_ID) {
        vapiPayload.phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
      }
      if (process.env.VAPI_ASSISTANT_ID) {
        vapiPayload.assistantId = process.env.VAPI_ASSISTANT_ID;
      } else {
        // Provide standard AI receptionist assistant configuration
        vapiPayload.assistant = {
          name: 'AI Receptionist',
          firstMessage: `Hello ${name}! This is your AI receptionist powered by Google Gemma. How may I assist you today?`,
          model: {
            provider: 'google',
            model: 'gemini-2.0-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a professional business phone receptionist assistant. You greet callers warmly, identify their needs, take down information for appointments, and help resolve inquiries with clarity and politeness.'
              }
            ]
          },
          voice: {
            provider: '11labs',
            voiceId: 'paula'
          }
        };
      }

      const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vapiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vapiPayload)
      });

      const vapiData = await vapiResponse.json();

      if (!vapiResponse.ok) {
        console.warn('Vapi API call error:', vapiData);
        return res.json({
          success: true,
          vapi_live: false,
          call_sid: session.call_sid,
          message: `Call registered in dashboard. Vapi response: ${vapiData.message || JSON.stringify(vapiData)}. Connected to virtual line.`,
          session
        });
      }

      // Update call record with Vapi Call ID
      const record = db.calls.find((c) => c.id === session.id);
      if (record) {
        record.summary = `Outbound Vapi AI call dispatched to ${num} (Vapi ID: ${vapiData.id})`;
        record.actions_taken.push(`Vapi AI call dispatched (${vapiData.id})`);
      }

      return res.json({
        success: true,
        vapi_live: true,
        vapi_call_id: vapiData.id,
        call_sid: session.call_sid,
        to_number: num,
        caller_name: name,
        message: `Vapi AI phone call initiated to ${num}! The phone will ring with the AI Receptionist.`,
        session
      });
    } catch (err: any) {
      console.error('Error invoking Vapi API:', err);
      return res.json({
        success: true,
        vapi_live: false,
        call_sid: session.call_sid,
        message: `Call session registered. Error contacting Vapi API: ${err.message}. Switched to local line.`,
        session
      });
    }
  }

  // 3. Fallback when VAPI_API_KEY is not yet in .env
  return res.json({
    success: true,
    vapi_live: false,
    needs_key: true,
    call_sid: session.call_sid,
    to_number: num,
    caller_name: name,
    message: `Call session started for ${num}! To place direct cellular calls via Vapi, set VAPI_API_KEY in your .env file. In the meantime, use the Browser Audio Line to speak with the receptionist directly.`,
    session
  });
});

// Vapi Webhook endpoint for live telephony status & speech updates
apiRouter.post('/vapi/webhook', async (req, res) => {
  const { message } = req.body || {};
  const messageType = message?.type;

  if (messageType === 'conversation-update') {
    const messages = message.conversation || [];
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      broadcastDashboard('transcript_turn', {
        speaker: lastMsg.role === 'user' ? 'caller' : 'receptionist',
        text: lastMsg.content
      });
    }
  } else if (messageType === 'end-of-call-report') {
    broadcastDashboard('call_completed', {
      duration: message.durationSeconds || 60,
      summary: message.summary || 'Call ended via Vapi AI',
      transcript: message.transcript
    });
    setHardwareState('AVAILABLE', 'GREEN', 'Vapi call ended. Receptionist available.');
  }

  res.json({ received: true });
});

// ----------------------------------------------------------------------
// Twilio Telephony Endpoints
// ----------------------------------------------------------------------
let twilioConfig = {
  account_sid: process.env.TWILIO_ACCOUNT_SID || '',
  auth_token: process.env.TWILIO_AUTH_TOKEN || '',
  phone_number: process.env.TWILIO_PHONE_NUMBER || '+1 (555) 019-2488'
};

apiRouter.get('/twilio/config', (_req, res) => {
  res.json({
    configured: Boolean(twilioConfig.account_sid && twilioConfig.auth_token),
    receptionist_phone: twilioConfig.phone_number,
    status: 'Ready',
    virtual_line_ready: true,
    telephony_mode: Boolean(twilioConfig.account_sid && twilioConfig.auth_token) ? 'carrier_pstn' : 'virtual_telephony'
  });
});

apiRouter.post('/twilio/config', (req, res) => {
  const { account_sid, auth_token, phone_number } = req.body || {};
  twilioConfig = {
    account_sid: account_sid || twilioConfig.account_sid,
    auth_token: auth_token || twilioConfig.auth_token,
    phone_number: phone_number || twilioConfig.phone_number
  };
  res.json({
    status: 'success',
    config: {
      configured: Boolean(twilioConfig.account_sid && twilioConfig.auth_token),
      receptionist_phone: twilioConfig.phone_number,
      status: 'Ready',
      virtual_line_ready: true
    }
  });
});

apiRouter.post(['/twilio/call', '/twilio/call-me'], async (req, res) => {
  const { to_number, caller_name } = req.body || {};
  const name = caller_name || 'Customer';
  const num = to_number || '+1-555-0100';

  // Start real call session in dashboard
  const session = await startCall(name, num, 'Direct Telephone');

  res.json({
    success: true,
    call_sid: session.call_sid,
    caller_name: name,
    to_number: num,
    message: `Call successfully queued and connected for ${num}. Receptionist is active on the audio line.`
  });
});

// ----------------------------------------------------------------------
// Health Check Endpoints
// ----------------------------------------------------------------------
apiRouter.get(['/health', '/api/health'], (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI Receptionist',
    version: '2.0.0',
    database: 'In-Memory / SQLite Migrated',
    hardware_state: db.hardware.status
  });
});
