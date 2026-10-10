import { db, Appointment } from './state';

export function parseRequestedSlot(dateStr: string, timeStr: string): { start: Date; end: Date } {
  const now = new Date();
  let targetDate = new Date(now);

  const dLower = (dateStr || '').toLowerCase();
  if (dLower.includes('next tuesday')) {
    const daysAhead = (2 - now.getDay() + 7) % 7 || 7;
    targetDate.setDate(now.getDate() + daysAhead);
  } else if (dLower.includes('tuesday')) {
    const daysAhead = (2 - now.getDay() + 7) % 7 || 7;
    targetDate.setDate(now.getDate() + daysAhead);
  } else if (dLower.includes('tomorrow')) {
    targetDate.setDate(now.getDate() + 1);
  } else {
    targetDate.setDate(now.getDate() + 2);
  }

  let hour = 14; // Default 2 PM
  const tLower = (timeStr || '').toLowerCase();
  if (tLower.includes('10')) hour = 10;
  else if (tLower.includes('11')) hour = 11;
  else if (tLower.includes('1') && tLower.includes('pm')) hour = 13;
  else if (tLower.includes('2') || tLower.includes('14')) hour = 14;
  else if (tLower.includes('3') || tLower.includes('15')) hour = 15;
  else if (tLower.includes('4') || tLower.includes('16')) hour = 16;
  else if (tLower.includes('9')) hour = 9;

  targetDate.setHours(hour, 0, 0, 0);
  const endDate = new Date(targetDate.getTime() + 45 * 60 * 1000);

  return { start: targetDate, end: endDate };
}

export function checkAvailability(start: Date, end: Date, team = 'Sales', excludeCallId?: number) {
  const hour = start.getHours();
  if (hour < 9 || hour >= 17) {
    return {
      available: false,
      reason: 'Requested time is outside business hours (9:00 AM - 5:00 PM).'
    };
  }

  const conflict = db.appointments.find((a) => {
    if (a.team !== team || a.status !== 'confirmed') return false;
    if (excludeCallId && a.call_id === excludeCallId) return false;
    const aStart = new Date(a.start_time);
    const aEnd = new Date(a.end_time);
    return aStart < end && aEnd > start;
  });

  if (conflict) {
    return {
      available: false,
      reason: `Slot conflicts with an existing booking '${conflict.title}' at ${new Date(conflict.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
    };
  }

  return {
    available: true,
    reason: `${team} team is free on ${start.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
  };
}

export function createMeeting(params: {
  attendee_name: string;
  attendee_email: string;
  start_time: Date;
  end_time: Date;
  team?: string;
  notes?: string;
  call_id?: number;
}) {
  const team = params.team || 'Sales';
  const avail = checkAvailability(params.start_time, params.end_time, team, params.call_id);
  if (!avail.available) {
    return {
      success: false,
      message: avail.reason,
      event_id: null
    };
  }

  const eventId = `evt_${Math.random().toString(36).substring(2, 12)}`;
  const title = `${team} Meeting with ${params.attendee_name}`;

  const newApp: Appointment = {
    id: db.nextAppointmentId++,
    call_id: params.call_id,
    title,
    start_time: params.start_time.toISOString(),
    end_time: params.end_time.toISOString(),
    attendee_name: params.attendee_name,
    attendee_email: params.attendee_email,
    team,
    calendar_event_id: eventId,
    status: 'confirmed',
    notes: params.notes || '',
    created_at: new Date().toISOString()
  };

  db.appointments.unshift(newApp);

  return {
    success: true,
    appointment_id: newApp.id,
    event_id: eventId,
    title,
    start_time: newApp.start_time,
    end_time: newApp.end_time,
    attendee_name: newApp.attendee_name,
    attendee_email: newApp.attendee_email,
    team,
    calendar_provider: 'Google Calendar (Connected/Demo Gateway)',
    message: `Confirmed! Meeting scheduled for ${params.start_time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} at ${params.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Calendar invite issued to ${params.attendee_email}.`
  };
}
