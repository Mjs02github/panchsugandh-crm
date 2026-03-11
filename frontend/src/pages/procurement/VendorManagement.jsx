import { useState, useEffect } from 'react';
import api from '../../api';
import { UserPlus, Search, Phone, Mail, MapPin, Tag, Edit2, Trash2, CheckCircle, Clock } from 'lucide-react';

export default function VendorManagement() {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [formData, setFormData] = useState({
        name: '', contact_person: '', phone: '', email: '', 
        address: '', gstin: '', category: '', material_names: '', status: 'ACTIVE'
    });

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const { data } = await api.get('/procurement/vendors');
            setVendors(data);
        } catch (error) {
            console.error('Error fetching vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingVendor) {
                await api.put(`/procurement/vendors/${editingVendor.id}`, formData);
            } else {
                await api.post('/procurement/vendors', formData);
            }
            setShowModal(false);
            setEditingVendor(null);
            setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', gstin: '', category: '', material_names: '', status: 'ACTIVE' });
            fetchVendors();
        } catch (error) {
            alert('Error saving vendor: ' + error.message);
        }
    };

    const handleEdit = (vendor) => {
        setEditingVendor(vendor);
        setFormData({ ...vendor });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this vendor?')) return;
        try {
            await api.delete(`/procurement/vendors/${id}`);
            fetchVendors();
        } catch (error) {
            alert('Error deleting vendor');
        }
    };

    const filteredVendors = vendors.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (v.category && v.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
                             (v.material_names && v.material_names.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = filterStatus === 'ALL' || v.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => window.history.back()}
                        className="text-gray-500 hover:text-gray-700 bg-white border border-gray-200 p-2 rounded-lg"
                    >
                        ←
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Vendor Management</h1>
                        <p className="text-gray-500 text-sm">Manage suppliers and potential vendors</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setEditingVendor(null); setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', gstin: '', category: '', material_names: '', status: 'ACTIVE' }); setShowModal(true); }}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                    >
                        <UserPlus size={18} />
                        Add Vendor
                    </button>
                </div>
            </div>

            {/* Sub-Nav */}
            <div className="flex gap-4 border-b border-gray-200 -mt-2 pb-0">
                <a href="#/procurement" className="px-1 py-2 text-sm text-gray-500 hover:text-indigo-600">Dashboard</a>
                <a href="#/procurement/vendors" className="px-1 py-2 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600">Vendors</a>
                <a href="#/procurement/planning" className="px-1 py-2 text-sm text-gray-500 hover:text-indigo-600">Planning</a>
                <a href="#/procurement/requests" className="px-1 py-2 text-sm text-gray-500 hover:text-indigo-600">Store Req</a>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search vendors or categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="POTENTIAL">Potential</option>
                </select>
            </div>

            {/* Vendor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-10 text-gray-500 italic">Loading vendors...</div>
                ) : filteredVendors.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-gray-500 italic">No vendors found.</div>
                ) : filteredVendors.map(vendor => (
                    <div key={vendor.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">{vendor.name}</h3>
                                    <div className="flex gap-1 flex-wrap mt-1">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase border border-indigo-100">
                                            {vendor.category || 'General'}
                                        </span>
                                        {vendor.material_names && (
                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 italic">
                                                {vendor.material_names}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${vendor.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {vendor.status === 'ACTIVE' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                    {vendor.status}
                                </span>
                            </div>

                            <div className="space-y-3 text-sm text-gray-600">
                                <div className="flex items-center gap-3">
                                    <Tag className="text-gray-400" size={16} />
                                    <span>{vendor.contact_person || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="text-gray-400" size={16} />
                                    <a href={`tel:${vendor.phone}`} className="hover:text-indigo-600">{vendor.phone || 'N/A'}</a>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="text-gray-400" size={16} />
                                    <a href={`mailto:${vendor.email}`} className="hover:text-indigo-600 truncate">{vendor.email || 'N/A'}</a>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin className="text-gray-400 mt-1 flex-shrink-0" size={16} />
                                    <span className="line-clamp-2">{vendor.address || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 px-5 py-3 flex justify-end gap-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(vendor)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Edit">
                                <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(vendor.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                    <input type="text" value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <input type="text" placeholder="e.g. Chemicals, Packaging" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <textarea rows="2" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                                    <input type="text" value={formData.gstin} onChange={e => setFormData({ ...formData, gstin: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1 font-bold text-indigo-700">Supplied Material Names</label>
                                    <input type="text" placeholder="e.g. HDPE Bags, Paraffin Oil, Cartons" value={formData.material_names || ''} onChange={e => setFormData({ ...formData, material_names: e.target.value })} className="w-full px-4 py-2 border-2 border-indigo-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                    <p className="text-[10px] text-gray-400 mt-1 italic">Enter specific materials supplied by this vendor</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option value="ACTIVE">Active</option>
                                        <option value="POTENTIAL">Potential</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-200">Save Vendor</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
