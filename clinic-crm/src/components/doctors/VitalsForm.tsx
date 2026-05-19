import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Vitals } from '@/types/consultation';

interface VitalsFormProps {
  vitals?: Vitals;
  onChange: (vitals: Vitals) => void;
  disabled?: boolean;
}

export const VitalsForm = ({ vitals = {}, onChange, disabled }: VitalsFormProps) => {
  const handleChange = (field: keyof Vitals, value: string | number) => {
    const numValue = typeof value === 'string' ? (value === '' ? undefined : parseFloat(value)) : value;
    onChange({ ...vitals, [field]: numValue });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Vitals (Optional)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bp-sys">BP Systolic</Label>
            <div className="flex gap-2">
              <Input
                id="bp-sys"
                type="number"
                placeholder="120"
                value={vitals.bp_sys ?? ''}
                onChange={(e) => handleChange('bp_sys', e.target.value)}
                disabled={disabled}
              />
              <span className="flex items-center text-sm text-gray-500">mmHg</span>
            </div>
          </div>

          <div>
            <Label htmlFor="bp-dia">BP Diastolic</Label>
            <div className="flex gap-2">
              <Input
                id="bp-dia"
                type="number"
                placeholder="80"
                value={vitals.bp_dia ?? ''}
                onChange={(e) => handleChange('bp_dia', e.target.value)}
                disabled={disabled}
              />
              <span className="flex items-center text-sm text-gray-500">mmHg</span>
            </div>
          </div>

          <div>
            <Label htmlFor="temp">Temperature</Label>
            <div className="flex gap-2">
              <Input
                id="temp"
                type="number"
                step="0.1"
                placeholder="37.5"
                value={vitals.temp ?? ''}
                onChange={(e) => handleChange('temp', e.target.value)}
                disabled={disabled}
              />
              <span className="flex items-center text-sm text-gray-500">°C</span>
            </div>
          </div>

          <div>
            <Label htmlFor="weight">Weight</Label>
            <div className="flex gap-2">
              <Input
                id="weight"
                type="number"
                step="0.5"
                placeholder="70"
                value={vitals.weight ?? ''}
                onChange={(e) => handleChange('weight', e.target.value)}
                disabled={disabled}
              />
              <span className="flex items-center text-sm text-gray-500">kg</span>
            </div>
          </div>

          <div>
            <Label htmlFor="spo2">SpO₂</Label>
            <div className="flex gap-2">
              <Input
                id="spo2"
                type="number"
                placeholder="98"
                value={vitals.spo2 ?? ''}
                onChange={(e) => handleChange('spo2', e.target.value)}
                disabled={disabled}
              />
              <span className="flex items-center text-sm text-gray-500">%</span>
            </div>
          </div>

          <div>
            <Label htmlFor="pulse">Pulse</Label>
            <div className="flex gap-2">
              <Input
                id="pulse"
                type="number"
                placeholder="72"
                value={vitals.pulse ?? ''}
                onChange={(e) => handleChange('pulse', e.target.value)}
                disabled={disabled}
              />
              <span className="flex items-center text-sm text-gray-500">bpm</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
