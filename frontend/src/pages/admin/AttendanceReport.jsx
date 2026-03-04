import { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AttendanceReport() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        api.get('/attendance/report', { params: { date } })
            .then(res => setRecords(res.data))
            .catch(err => setError('Failed to fetch attendance report.'))
            .finally(() => setLoading(false));
    }, [date]);

    const handleBack = () => navigate(-1);

    return (
        <div className="pb-24">
            <div className="page-header border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm">
                        <span className="text-gray-600 block leading-none relative -top-[1px]">←</span>
                    </button>
                    <h1 className="text-lg font-semibold text-gray-800">Attendance Report</h1>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="card">
                    <label className="label">Select Date</label>
                    <input
                        className="input"
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                    />
                </div>

                <div className="card overflow-x-auto p-0">
                    {loading ? (
                        <div className="flex justify-center py-6">
                            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : records.length === 0 ? (
                        <p className="text-gray-500 text-center py-6 text-sm">No attendance records found for this date.</p>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                                    <th className="px-4 py-3 font-medium">Salesperson</th>
                                    <th className="px-4 py-3 font-medium">Punch In</th>
                                    <th className="px-4 py-3 font-medium">Punch Out</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {records.map(record => {
                                    const inTime = record.punch_in_time ? new Date(record.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                                    const outTime = record.punch_out_time ? new Date(record.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                                    const isComplete = !!record.punch_out_time;

                                    return (
                                        <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-800">{record.user_name}</div>
                                                <div className="text-xs text-gray-400 capitalize">{record.role_name.replace('_', ' ')}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {inTime}
                                                {record.punch_in_lat && (
                                                    <a href={`https://maps.google.com/?q=${record.punch_in_lat},${record.punch_in_lng}`} target="_blank" rel="noreferrer" className="block text-xs text-blue-500 mt-0.5">📍 Map</a>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {outTime}
                                                {record.punch_out_lat && (
                                                    <a href={`https://maps.google.com/?q=${record.punch_out_lat},${record.punch_out_lng}`} target="_blank" rel="noreferrer" className="block text-xs text-blue-500 mt-0.5">📍 Map</a>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {isComplete ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Done</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Working</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
