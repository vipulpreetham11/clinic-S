import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Prescription } from '@/types/consultation';
import { X, Plus } from 'lucide-react';

const PRESCRIPTION_FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'SOS'];

interface PrescriptionBuilderProps {
  medicines: Prescription[];
  onChange: (medicines: Prescription[]) => void;
  disabled?: boolean;
}

export const PrescriptionBuilder = ({
  medicines = [],
  onChange,
  disabled,
}: PrescriptionBuilderProps) => {
  const [editing, setEditing] = useState<number | null>(null);

  const handleAddMedicine = () => {
    const newMedicine: Prescription = {
      medicine: '',
      dosage: '',
      frequency: 'OD',
      duration: '',
      instructions: '',
    };
    onChange([...medicines, newMedicine]);
    setEditing(medicines.length);
  };

  const handleUpdateMedicine = (index: number, field: keyof Prescription, value: string) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemoveMedicine = (index: number) => {
    onChange(medicines.filter((_, i) => i !== index));
    if (editing === index) setEditing(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Prescription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {medicines.length === 0 ? (
            <p className="text-sm text-gray-500">No medicines added yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Medicine</th>
                    <th className="text-left py-2 px-2">Dosage</th>
                    <th className="text-left py-2 px-2">Frequency</th>
                    <th className="text-left py-2 px-2">Duration</th>
                    <th className="text-left py-2 px-2">Instructions</th>
                    <th className="text-left py-2 px-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((med, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2">
                        <Input
                          value={med.medicine}
                          onChange={(e) => handleUpdateMedicine(idx, 'medicine', e.target.value)}
                          disabled={disabled}
                          className="h-8 text-xs"
                          placeholder="e.g., Paracetamol"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          value={med.dosage}
                          onChange={(e) => handleUpdateMedicine(idx, 'dosage', e.target.value)}
                          disabled={disabled}
                          className="h-8 text-xs"
                          placeholder="e.g., 500mg"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={med.frequency}
                          onChange={(e) =>
                            handleUpdateMedicine(idx, 'frequency', e.target.value)
                          }
                          disabled={disabled}
                          className="w-full h-8 text-xs border rounded px-2 py-1"
                        >
                          {PRESCRIPTION_FREQUENCIES.map((freq) => (
                            <option key={freq} value={freq}>
                              {freq}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          value={med.duration}
                          onChange={(e) => handleUpdateMedicine(idx, 'duration', e.target.value)}
                          disabled={disabled}
                          className="h-8 text-xs"
                          placeholder="e.g., 5 days"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          value={med.instructions}
                          onChange={(e) =>
                            handleUpdateMedicine(idx, 'instructions', e.target.value)
                          }
                          disabled={disabled}
                          className="h-8 text-xs"
                          placeholder="e.g., After food"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => handleRemoveMedicine(idx)}
                          disabled={disabled}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Button
            type="button"
            onClick={handleAddMedicine}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Medicine
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
