import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useDoctorProfile } from '@/hooks/useDoctorProfile';
import { toast } from 'sonner';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DoctorProfile() {
  const { profile, loading, isSaving, updateProfile } = useDoctorProfile();

  interface ProfileFormData {
    name: string;
    specialization: string;
    qualification: string;
    bio: string;
    nmc_registration: string;
    languages: string;
    working_days: string[];
    slot_duration: number;
    consultation_fee: string;
    phone: string;
    photo_url: string;
  }

  const [formData, setFormData] = useState<ProfileFormData>({
    name: profile?.name || '',
    specialization: profile?.specialization || '',
    qualification: profile?.qualification || '',
    bio: '',
    nmc_registration: '',
    languages: '',
    working_days: profile?.working_days || [],
    slot_duration: profile?.slot_duration || 30,
    consultation_fee: '',
    phone: profile?.phone || '',
    photo_url: profile?.photo_url || '',
  });

  const handleToggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day],
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const updates = {
      name: formData.name,
      specialization: formData.specialization,
      qualification: formData.qualification,
      phone: formData.phone,
      working_days: formData.working_days,
      slot_duration: formData.slot_duration,
    };

    const success = await updateProfile(updates);
    if (success) {
      toast.success('Profile updated successfully');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Manage your professional information</p>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Dr. John Doe"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="9876543210"
              />
            </div>
          </div>

          <div>
            <Label>Specialization</Label>
            <Input
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              placeholder="e.g., Cardiology, General Practice"
            />
          </div>

          <div>
            <Label>Qualifications</Label>
            <Input
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              placeholder="e.g., MBBS, MD (Internal Medicine)"
            />
          </div>

          <div>
            <Label>NMC Registration Number</Label>
            <Input
              value={formData.nmc_registration}
              onChange={(e) => setFormData({ ...formData, nmc_registration: e.target.value })}
              placeholder="Reg No."
            />
          </div>
        </CardContent>
      </Card>

      {/* Professional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Bio (shown to patients)</Label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Brief bio visible to patients..."
              className="min-h-24"
            />
          </div>

          <div>
            <Label>Languages Spoken</Label>
            <Input
              value={formData.languages}
              onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
              placeholder="e.g., English, Hindi, Marathi"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Default Slot Duration (minutes)</Label>
              <select
                value={formData.slot_duration}
                onChange={(e) =>
                  setFormData({ ...formData, slot_duration: parseInt(e.target.value) })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>

            <div>
              <Label>Consultation Fee</Label>
              <div className="flex gap-2">
                <span className="flex items-center text-gray-600">₹</span>
                <Input
                  type="number"
                  value={formData.consultation_fee}
                  onChange={(e) =>
                    setFormData({ ...formData, consultation_fee: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle>Working Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                onClick={() => handleToggleDay(day)}
                className={`px-3 py-2 rounded transition ${
                  formData.working_days.includes(day)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Selected: {formData.working_days.length} day{formData.working_days.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
