import React from 'react';
import { Calendar, Clock, User, Mail, CheckCircle2 } from 'lucide-react';
import { Appointment } from '../types';

interface Props {
  appointments: Appointment[];
}

export const CalendarAppointmentsView: React.FC<Props> = ({ appointments }) => {
  return (
    <div className="apple-card p-6 space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white">
            <Calendar className="w-4 h-4 text-[#2997ff]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">Calendar Bookings</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-[#86868b] border border-white/[0.08]">
                Google Calendar & Demo Gateway
              </span>
            </div>
            <p className="text-xs text-[#86868b]">
              Confirmed appointments verified via calendar availability check
            </p>
          </div>
        </div>

        <span className="text-xs font-medium text-[#86868b] bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
          {appointments.length} Bookings
        </span>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-10 text-[#86868b] text-xs">
          No appointments booked yet. The AI receptionist will automatically log meetings here once confirmed.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {appointments.map((app) => {
            const start = new Date(app.start_time);
            const end = new Date(app.end_time);

            return (
              <div
                key={app.id}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition space-y-2.5 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white text-xs tracking-tight">{app.title}</h4>
                    <span className="text-[11px] text-[#2997ff] font-medium">
                      {app.team} Team
                    </span>
                  </div>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#34c759]/15 text-[#34c759] border border-[#34c759]/30 text-[10px] font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Confirmed</span>
                  </span>
                </div>

                <div className="space-y-1 text-[#86868b] text-[11px]">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} • {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span className="text-white">{app.attendee_name}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{app.attendee_email}</span>
                  </div>
                </div>

                {app.notes && (
                  <p className="text-[11px] text-[#86868b] italic border-t border-white/[0.04] pt-2">
                    "{app.notes}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
