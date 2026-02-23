'use client'
import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { fetchUploads, addUpload, updateUploadStatus } from '@/store/slices/uploadSlice';
import { logout } from '@/store/slices/authSlice';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import { useSocket } from '@/hooks/useSocket';
import {
    LogOut,
    UploadCloud,
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    Loader2,
    TrendingUp,
    Package,
    DollarSign,
    Search,
    Calendar,
    Filter,
    ChevronLeft,
    ChevronRight,
    X
} from 'lucide-react';

export default function DashboardPage() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const { uploads, loading, pagination } = useSelector((state: RootState) => state.uploads);
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const socket = useSocket();
    const [mounted, setMounted] = useState(false);

    // Filter and Pagination State
    const [searchInput, setSearchInput] = useState('');
    const [startDateInput, setStartDateInput] = useState('');
    const [endDateInput, setEndDateInput] = useState('');
    const [statusInput, setStatusInput] = useState('');
    const [fetchParams, setFetchParams] = useState({
        search: '',
        startDate: '',
        endDate: '',
        status: '',
        page: 1,
        limit: 10
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated) {
            router.replace('/login');
        } else {
            dispatch(fetchUploads(fetchParams));
        }
    }, [isAuthenticated, dispatch, router, mounted, fetchParams]);

    const handleLogout = () => {
        dispatch(logout());
        router.replace('/login');
    };

    const handleApplyFilters = () => {
        setFetchParams({
            search: searchInput,
            startDate: startDateInput,
            endDate: endDateInput,
            status: statusInput,
            page: 1,
            limit: 10
        });
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setStartDateInput('');
        setEndDateInput('');
        setStatusInput('');
        setFetchParams({
            search: '',
            startDate: '',
            endDate: '',
            status: '',
            page: 1,
            limit: 10
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
                toast.error('Please upload an Excel (.xlsx/.xls) file');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            setUploading(true);
            const toastId = toast.loading('Uploading file...');
            try {
                const res = await api.post('/uploads', formData);
                toast.success('Upload received! Processing in background...', { id: toastId });

                dispatch(addUpload({
                    _id: res.data.uploadId,
                    fileName: file.name,
                    status: 'pending',
                    uploadedAt: new Date().toISOString()
                }));
            } catch (err: any) {
                toast.error(err.response?.data?.message || 'Upload failed', { id: toastId });
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    useEffect(() => {
        if (socket) {
            socket.on('uploadStatus', (data: any) => {
                dispatch(updateUploadStatus({
                    uploadId: data.uploadId,
                    status: data.status,
                    processedAt: data.processedAt,
                    totalRevenue: data.totalRevenue,
                    totalItems: data.totalItems,
                    averageOrderValue: data.averageOrderValue,
                    errorMessage: data.error,
                    emailSent: data.emailSent,
                    targetEmail: data.targetEmail
                }));

                if (data.status === 'completed') {
                    toast.success('Your file was processed completely!');
                } else if (data.status === 'failed') {
                    toast.error(`Processing failed: ${data.error}`);
                }

                if (data.emailSent) {
                    toast(`📧 An email report has been sent to your email ${data.targetEmail || ''}`, {
                        duration: 5000,
                        style: {
                            borderRadius: '10px',
                            background: '#333',
                            color: '#fff',
                        },
                    });
                }
            });
        }

        return () => {
            if (socket) {
                socket.off('uploadStatus');
            }
        };
    }, [socket, dispatch]);

    if (!mounted) return null;
    if (!isAuthenticated) return null;

    // Date formatter: 10:00 AM PM format
    const formatDateTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'failed': return <XCircle className="w-5 h-5 text-rose-500" />;
            case 'processing': return <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />;
            default: return <Loader2 className="w-5 h-5 text-slate-400 animate-pulse" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const baseStyle = "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit shadow-sm";
        switch (status) {
            case 'completed':
                return <div className={`${baseStyle} bg-emerald-50 text-emerald-700 border border-emerald-200`}>
                    {getStatusIcon(status)} Completed
                </div>;
            case 'failed':
                return <div className={`${baseStyle} bg-rose-50 text-rose-700 border border-rose-200`}>
                    {getStatusIcon(status)} Failed
                </div>;
            case 'processing':
                return <div className={`${baseStyle} bg-amber-50 text-amber-700 border border-amber-200`}>
                    {getStatusIcon(status)} Processing
                </div>;
            default:
                return <div className={`${baseStyle} bg-slate-50 text-slate-700 border border-slate-200`}>
                    {getStatusIcon(status)} Pending
                </div>;
        }
    };

    const getPageNumbers = () => {
        if (!pagination) return [];
        const current = pagination.page;
        const total = pagination.pages;

        if (total <= 5) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        if (current <= 3) {
            return [1, 2, 3, 4, '...', total];
        } else if (current >= total - 2) {
            return [1, '...', total - 3, total - 2, total - 1, total];
        } else {
            return [1, '...', current - 1, current, current + 1, '...', total];
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
            {/* Top Navigation */}
            <nav className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center">
                                <FileSpreadsheet className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-600 tracking-tight">
                                Bulk Order Dashboard
                            </h1>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 bg-white hover:text-rose-600 hover:bg-rose-50 transition-all duration-300 border border-slate-200 hover:border-rose-200 shadow-sm hover:shadow-md"
                        >
                            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 relative">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[100px] -z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-violet-100/40 rounded-full blur-[100px] -z-10 pointer-events-none" />

                {/* Upload Section */}
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-indigo-50/80 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-700 ease-out transform translate-x-10 translate-y-[-10px] group-hover:translate-x-0 group-hover:translate-y-0" />

                    <div className="z-10 text-center md:text-left">
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Upload New Orders</h2>
                        <p className="text-slate-500 text-sm max-w-md mx-auto md:mx-0 leading-relaxed">
                            Select an Excel (.xlsx or .xls) file to process bulk orders securely. Processing will continue seamlessly in the background.
                        </p>
                    </div>

                    <div className="z-10 w-full md:w-auto">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full md:w-auto relative inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98] overflow-hidden"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="w-5 h-5" />
                                    Upload Excel File
                                </>
                            )}
                        </button>
                    </div>
                </section>

                {/* Upload History Table Section */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <div className="px-6 py-5 border-b border-slate-200 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Upload History</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Recent bulk operations and their status</p>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search filename..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full md:w-48"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="date"
                                        value={startDateInput}
                                        onChange={(e) => setStartDateInput(e.target.value)}
                                        className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-[140px]"
                                    />
                                </div>
                                <span className="text-slate-400 text-sm">to</span>
                                <div className="relative">
                                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="date"
                                        value={endDateInput}
                                        onChange={(e) => setEndDateInput(e.target.value)}
                                        className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-[140px]"
                                    />
                                </div>
                            </div>
                            <div className="relative w-full md:w-36">
                                <select
                                    value={statusInput}
                                    onChange={(e) => setStatusInput(e.target.value)}
                                    className="appearance-none w-full pl-4 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="processing">Processing</option>
                                    <option value="completed">Completed</option>
                                    <option value="failed">Failed</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                    <ChevronRight className="w-4 h-4 rotate-90" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 md:mt-0">
                                <button
                                    onClick={handleApplyFilters}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors border border-indigo-100"
                                >
                                    <Filter className="w-4 h-4" />
                                    Filter
                                </button>
                                {(searchInput || startDateInput || endDateInput || statusInput || fetchParams.search || fetchParams.startDate || fetchParams.endDate || fetchParams.status) && (
                                    <button
                                        onClick={handleClearFilters}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors border border-slate-200"
                                    >
                                        <X className="w-4 h-4" />
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                    <th className="px-6 py-4 rounded-tl-lg font-bold">File Name</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold">Total Revenue</th>
                                    <th className="px-6 py-4 font-bold">Items</th>
                                    <th className="px-6 py-4 font-bold">AOV</th>
                                    <th className="px-6 py-4 font-bold">Uploaded At</th>
                                    <th className="px-6 py-4 font-bold rounded-tr-lg">Processed At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && uploads.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center h-48">
                                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-4" />
                                            <p className="text-sm text-slate-500 font-medium">Fetching history...</p>
                                        </td>
                                    </tr>
                                ) : uploads.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-16 text-center">
                                            <div className="bg-indigo-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-indigo-100 rotate-3 shadow-inner">
                                                <FileSpreadsheet className="w-10 h-10 text-indigo-300 -rotate-3" />
                                            </div>
                                            <p className="text-base font-semibold text-slate-700 mb-1">No uploads found</p>
                                            <p className="text-sm text-slate-500">Start by uploading your first Excel processing file.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    uploads.map((upload) => (
                                        <tr key={upload._id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-6 py-5 align-middle">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shadow-sm border border-slate-200 group-hover:border-indigo-200">
                                                        <FileSpreadsheet className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 line-clamp-1 max-w-[200px] md:max-w-xs" title={upload.fileName}>{upload.fileName}</p>
                                                        <p className="text-xs text-slate-400 font-mono mt-1">ID: {upload._id.substring(0, 8)}...</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                {getStatusBadge(upload.status)}
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <span className="font-semibold text-slate-800">
                                                    ${upload.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <span className="font-semibold text-slate-800">
                                                    {upload.totalItems?.toLocaleString() || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <span className="font-semibold text-indigo-600">
                                                    ${upload.averageOrderValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <div className="text-sm text-slate-600 font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 inline-block">
                                                    {formatDateTime(upload.uploadedAt)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <div className="text-sm text-slate-600 font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 inline-block">
                                                        {formatDateTime(upload.processedAt || '')}
                                                    </div>
                                                    {upload.status === 'failed' && (
                                                        <div className="text-xs text-rose-500 font-medium bg-rose-50 px-2 py-1 rounded-md border border-rose-100 max-w-[150px] truncate" title={upload.errorMessage}>
                                                            {upload.errorMessage}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {pagination && pagination.pages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-between shadow-inner">
                            <p className="text-sm text-slate-600">
                                Showing <span className="font-semibold">{uploads.length}</span> of <span className="font-semibold">{pagination.total}</span> items
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setFetchParams(prev => ({ ...prev, page: prev.page - 1 }))}
                                    disabled={pagination.page <= 1}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">Prev</span>
                                </button>

                                <div className="flex items-center gap-1 overflow-x-auto">
                                    {getPageNumbers().map((pageNum, idx) => (
                                        pageNum === '...' ? (
                                            <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 font-medium tracking-widest pointer-events-none">...</span>
                                        ) : (
                                            <button
                                                key={`page-${pageNum}`}
                                                onClick={() => setFetchParams(prev => ({ ...prev, page: pageNum as number }))}
                                                className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-all shadow-sm px-2 ${pagination.page === pageNum
                                                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/20 shadow-md'
                                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 focus:ring-2 focus:ring-indigo-500/30'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        )
                                    ))}
                                </div>

                                <button
                                    onClick={() => setFetchParams(prev => ({ ...prev, page: prev.page + 1 }))}
                                    disabled={pagination.page >= pagination.pages}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
