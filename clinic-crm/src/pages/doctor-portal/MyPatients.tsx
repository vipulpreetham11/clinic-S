import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMyPatients } from '@/hooks/useMyPatients';
import { Search } from 'lucide-react';
import { format } from 'date-fns';

export default function MyPatients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { patients, loading, error } = useMyPatients(search);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Patients</h1>
        <p className="text-gray-600 mt-1">
          {patients.length} patient{patients.length !== 1 ? 's' : ''} you've seen
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patient List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Loading patients...</p>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          ) : patients.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No patients found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Age</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Gender</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Visit</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Total Visits
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="border-b hover:bg-gray-50 transition cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{patient.name}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {patient.age ? `${patient.age}y` : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {patient.gender ? patient.gender[0].toUpperCase() : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{patient.phone}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {patient.lastVisit
                          ? format(new Date(patient.lastVisit.date), 'MMM dd, yyyy')
                          : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{patient.totalVisits}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
