import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, MapPin, Users, CheckCircle2, XCircle, HelpCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EventRSVPCard({ announcement, userEmail, onRSVP }) {
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [selectedResponse, setSelectedResponse] = useState(null);

  if (!announcement.is_event || !announcement.rsvp_enabled) return null;

  const userRSVP = announcement.rsvp_responses?.find(r => r.resident_email === userEmail);
  const attendingCount = announcement.rsvp_responses?.filter(r => r.response === 'attending').length || 0;
  const totalGuests = announcement.rsvp_responses?.reduce((sum, r) => sum + (r.guests_count || 0), 0) || 0;
  const totalAttending = attendingCount + totalGuests;
  const spotsRemaining = announcement.max_attendees ? announcement.max_attendees - totalAttending : null;
  const isDeadlinePassed = announcement.rsvp_deadline && new Date(announcement.rsvp_deadline) < new Date();
  const isFull = announcement.max_attendees && totalAttending >= announcement.max_attendees;

  const handleSubmitRSVP = () => {
    if (!selectedResponse) {
      toast.error('Please select a response');
      return;
    }

    onRSVP({
      response: selectedResponse,
      guests_count: selectedResponse === 'attending' ? guestCount : 0
    });
    
    setShowRSVPDialog(false);
    setSelectedResponse(null);
    setGuestCount(0);
  };

  const getResponseColor = (response) => {
    switch (response) {
      case 'attending': return 'bg-green-100 text-green-800';
      case 'not_attending': return 'bg-red-100 text-red-800';
      case 'maybe': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <>
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Event Details</CardTitle>
              </div>
              {userRSVP && (
                <Badge className={getResponseColor(userRSVP.response)}>
                  You're {userRSVP.response === 'attending' ? 'Attending' : userRSVP.response === 'not_attending' ? 'Not Attending' : 'Maybe'}
                </Badge>
              )}
            </div>
            {!isDeadlinePassed && !isFull && (
              <Button onClick={() => setShowRSVPDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                {userRSVP ? 'Update RSVP' : 'RSVP Now'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-700">Date & Time</p>
                <p className="text-sm text-slate-600">
                  {format(new Date(announcement.event_date), 'PPp')}
                </p>
              </div>
            </div>

            {announcement.event_location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Location</p>
                  <p className="text-sm text-slate-600">{announcement.event_location}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-700">Attendance</p>
                <p className="text-sm text-slate-600">
                  {totalAttending} attending{announcement.max_attendees && ` / ${announcement.max_attendees} max`}
                </p>
              </div>
            </div>

            {announcement.rsvp_deadline && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">RSVP Deadline</p>
                  <p className="text-sm text-slate-600">
                    {format(new Date(announcement.rsvp_deadline), 'PPP')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {isDeadlinePassed && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">RSVP deadline has passed</p>
            </div>
          )}

          {isFull && !isDeadlinePassed && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">Event is at full capacity</p>
            </div>
          )}

          {!isFull && !isDeadlinePassed && spotsRemaining !== null && spotsRemaining < 10 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">Only {spotsRemaining} spots remaining!</p>
            </div>
          )}

          {/* RSVP Summary */}
          <div className="pt-4 border-t border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{attendingCount}</p>
                  <p className="text-xs text-slate-600">Attending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {announcement.rsvp_responses?.filter(r => r.response === 'not_attending').length || 0}
                  </p>
                  <p className="text-xs text-slate-600">Not Attending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {announcement.rsvp_responses?.filter(r => r.response === 'maybe').length || 0}
                  </p>
                  <p className="text-xs text-slate-600">Maybe</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RSVP Dialog */}
      <Dialog open={showRSVPDialog} onOpenChange={setShowRSVPDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>RSVP to Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Will you attend?</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={selectedResponse === 'attending' ? 'default' : 'outline'}
                  className={selectedResponse === 'attending' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setSelectedResponse('attending')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Yes
                </Button>
                <Button
                  variant={selectedResponse === 'not_attending' ? 'default' : 'outline'}
                  className={selectedResponse === 'not_attending' ? 'bg-red-600 hover:bg-red-700' : ''}
                  onClick={() => setSelectedResponse('not_attending')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  No
                </Button>
                <Button
                  variant={selectedResponse === 'maybe' ? 'default' : 'outline'}
                  className={selectedResponse === 'maybe' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                  onClick={() => setSelectedResponse('maybe')}
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Maybe
                </Button>
              </div>
            </div>

            {selectedResponse === 'attending' && (
              <div className="space-y-2">
                <Label>Number of Guests (excluding yourself)</Label>
                <Input
                  type="number"
                  min="0"
                  max={announcement.max_attendees ? Math.max(0, spotsRemaining - 1) : 10}
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                {spotsRemaining !== null && (
                  <p className="text-xs text-slate-500">
                    {spotsRemaining - 1} guest spots remaining
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRSVPDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRSVP} disabled={!selectedResponse}>
              Submit RSVP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}