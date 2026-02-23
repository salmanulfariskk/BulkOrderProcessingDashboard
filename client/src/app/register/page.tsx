'use client'
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { setCredentials } from '@/store/slices/authSlice';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, LayoutDashboard, CheckCircle2, XCircle } from 'lucide-react';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Validation states
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [validationSubmitted, setValidationSubmitted] = useState(false);

    const dispatch = useDispatch();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Dynamic password validation state (can be shown securely to users as they type)
    const passwordRules = [
        { regex: /.{8,}/, message: 'At least 8 characters' },
        { regex: /[A-Z]/, message: 'One uppercase letter' },
        { regex: /[a-z]/, message: 'One lowercase letter' },
        { regex: /[0-9]/, message: 'One number' },
    ];

    const isPasswordValid = passwordRules.every(rule => rule.regex.test(password));

    const validate = () => {
        setValidationSubmitted(true);
        let isValid = true;

        // Email validation
        if (!email) {
            setEmailError('Email is required');
            isValid = false;
        } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
            setEmailError('Please enter a valid email address');
            isValid = false;
        } else {
            setEmailError('');
        }

        // Password validation
        if (!password) {
            setPasswordError('Password is required');
            isValid = false;
        } else if (!isPasswordValid) {
            setPasswordError('Please meet all password requirements');
            isValid = false;
        } else {
            setPasswordError('');
        }

        return isValid;
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);
        try {
            const res = await api.post('/auth/register', { email, password });
            dispatch(setCredentials({ token: res.data.token, user: { _id: res.data._id, email: res.data.email } }));
            toast.success('Account created successfully 🎉', {
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                },
            });
            router.push('/dashboard');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Registration failed', {
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                },
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans text-slate-800 relative overflow-hidden">
            {/* Decorative Orbs */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-200/50 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-violet-200/50 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 sm:p-10 relative z-10 transition-all duration-300 hover:shadow-indigo-100/50">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 text-white mb-6 transform rotate-6 hover:rotate-0 transition-transform duration-300">
                        <LayoutDashboard className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create your account</h2>
                    <p className="mt-3 text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                            Sign in to existing
                        </Link>
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleRegister} noValidate>
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className={`h-5 w-5 transition-colors ${emailError ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                            </div>
                            <input
                                type="email"
                                className={`block w-full pl-11 pr-4 py-3.5 bg-slate-50 border ${emailError ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 sm:text-sm`}
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (emailError) setEmailError('');
                                }}
                            />
                        </div>
                        {emailError && <p className="text-sm text-rose-500 mt-1.5 ml-1 flex items-center gap-1.5 slide-down"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>{emailError}</p>}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className={`h-5 w-5 transition-colors ${passwordError ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                className={`block w-full pl-11 pr-12 py-3.5 bg-slate-50 border ${passwordError ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 sm:text-sm`}
                                placeholder="Create a strong password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (passwordError) setPasswordError('');
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none p-2"
                                tabIndex={-1}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>

                        {/* Password Requirements Checkbox List */}
                        {(password.length > 0 || validationSubmitted) && (
                            <div className="mt-3 ml-1 space-y-1.5 slide-down">
                                {passwordRules.map((rule, idx) => {
                                    const passed = rule.regex.test(password);
                                    return (
                                        <div key={idx} className="flex items-center text-xs">
                                            {passed ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                                            ) : (
                                                <XCircle className={`w-4 h-4 ${validationSubmitted && !passed ? 'text-rose-500' : 'text-slate-300'} mr-2`} />
                                            )}
                                            <span className={passed ? 'text-slate-700 font-medium' : (validationSubmitted && !passed ? 'text-rose-500' : 'text-slate-500')}>
                                                {rule.message}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {passwordError && !isPasswordValid && !validationSubmitted && (
                            <p className="text-sm text-rose-500 mt-1.5 ml-1 flex items-center gap-1.5 slide-down">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>{passwordError}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-200 active:scale-[0.98] mt-8"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating account...
                            </>
                        ) : (
                            <>
                                Create account
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </div>

            <style jsx global>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .slide-down {
                    animation: slideDown 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
