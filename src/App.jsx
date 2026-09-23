import React, { useState, useEffect, useMemo } from 'react';
import { auth, googleProvider, db, storage } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Home,
  TrendingDown,
  TrendingUp,
  PieChart,
  Plus,
  Search,
  LogOut,
  Edit2,
  Check,
  Camera,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  ChevronRight,
  Smartphone
} from 'lucide-react';

function generateFamilyCode() {
  return `FAM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getCategoryById,
  formatCurrency
} from './constants/categories';
import TransactionModal from './components/TransactionModal';
import InviteModal from './components/InviteModal';
import ReportsView from './components/ReportsView';
import SharedNoteCard from './components/SharedNoteCard';
import BcvConverter from './components/BcvConverter';
import InvitationBanner from './components/InvitationBanner';

export default function App() {
  // Auth & Profile
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initial Profile Setup State
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [imageFile, setImageFile] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Family State
  const [family, setFamily] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isEditingFamilyName, setIsEditingFamilyName] = useState(false);
  const [tempFamilyName, setTempFamilyName] = useState('');

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'expenses' | 'incomes' | 'reports'
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalType, setTransactionModalType] = useState('expense');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Shared Note State
  const [sharedNote, setSharedNote] = useState('');
  const [sharedNoteAuthorName, setSharedNoteAuthorName] = useState('');
  const [sharedNoteAuthorColor, setSharedNoteAuthorColor] = useState('#EC4899');
  const [sharedNoteUpdatedAt, setSharedNoteUpdatedAt] = useState(null);

  // In-app Invitation State
  const [pendingInvitation, setPendingInvitation] = useState(null);

  // Subscriptions & Helpers
  const subscribeToFamily = (familyId) => {
    return onSnapshot(doc(db, 'families', familyId), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setFamily(data);
        setTempFamilyName(data.name || 'Finanzas Familiares');

        // Extract members
        if (data.memberProfiles) {
          const membersList = Object.entries(data.memberProfiles).map(([uid, prof]) => ({
            uid,
            ...prof
          }));
          setFamilyMembers(membersList);
        }

        // Extract shared note
        setSharedNote(data.sharedNote || '');
        setSharedNoteAuthorName(data.sharedNoteAuthorName || '');
        setSharedNoteAuthorColor(data.sharedNoteAuthorColor || '#EC4899');
        setSharedNoteUpdatedAt(data.sharedNoteUpdatedAt ? (data.sharedNoteUpdatedAt.toDate ? data.sharedNoteUpdatedAt.toDate().toISOString() : data.sharedNoteUpdatedAt) : null);
      }
    });
  };

  const subscribeToTransactions = (familyId) => {
    const txColRef = collection(db, 'families', familyId, 'transactions');
    const q = query(txColRef, orderBy('date', 'desc'), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
      setTransactions(list);
    });
  };

  async function resolveFamilyForUser(currentUser, userData) {
    try {
      // Check URL for join param: ?join=CODE
      const urlParams = new URLSearchParams(window.location.search);
      const joinCode = urlParams.get('join');

      let targetFamilyId = userData?.familyId || null;

      // If user provided a join code in URL
      if (joinCode) {
        // Clean URL parameter without reloading
        window.history.replaceState({}, document.title, window.location.pathname);

        // Find family with this inviteCode or ID
        const famQuery = query(collection(db, 'families'), where('inviteCode', '==', joinCode));
        const famSnap = await getDocs(famQuery);

        if (!famSnap.empty) {
          targetFamilyId = famSnap.docs[0].id;
        } else {
          // Direct ID lookup fallback
          const directDoc = await getDoc(doc(db, 'families', joinCode));
          if (directDoc.exists()) {
            targetFamilyId = directDoc.id;
          }
        }
      }

      // If still no familyId, check if current user's email was invited
      if (!targetFamilyId && currentUser.email) {
        const emailLower = currentUser.email.toLowerCase();
        const inviteQuery = query(
          collection(db, 'families'),
          where('invitedEmails', 'array-contains', emailLower)
        );
        const inviteSnap = await getDocs(inviteQuery);
        if (!inviteSnap.empty) {
          targetFamilyId = inviteSnap.docs[0].id;
        }
      }

      // If still no family, create a new shared family workspace
      if (!targetFamilyId) {
        const newFamRef = doc(collection(db, 'families'));
        const generatedCode = generateFamilyCode();
        const newFamData = {
          name: `Finanzas ${userData.name || 'Familiares'}`,
          ownerUid: currentUser.uid,
          members: [currentUser.uid],
          memberProfiles: {
            [currentUser.uid]: {
              name: userData.name || currentUser.displayName || 'Usuario',
              color: userData.color || '#3B82F6',
              avatar: userData.avatar || currentUser.photoURL || '',
              email: currentUser.email
            }
          },
          invitedEmails: [],
          inviteCode: generatedCode,
          createdAt: serverTimestamp()
        };

        await setDoc(newFamRef, newFamData);
        targetFamilyId = newFamRef.id;

        // Save familyId to user profile
        await updateDoc(doc(db, 'users', currentUser.uid), {
          familyId: targetFamilyId
        });
        setProfile((prev) => ({ ...prev, familyId: targetFamilyId }));
      } else {
        // Link user to this family if not already linked
        const famRef = doc(db, 'families', targetFamilyId);
        const famSnap = await getDoc(famRef);

        if (famSnap.exists()) {
          const emailLower = (currentUser.email || '').toLowerCase();
          await updateDoc(famRef, {
            members: arrayUnion(currentUser.uid),
            [`memberProfiles.${currentUser.uid}`]: {
              name: userData.name || currentUser.displayName || 'Usuario',
              color: userData.color || '#3B82F6',
              avatar: userData.avatar || currentUser.photoURL || '',
              email: currentUser.email
            },
            ...(emailLower ? { invitedEmails: arrayRemove(emailLower) } : {})
          });

          if (userData.familyId !== targetFamilyId) {
            await updateDoc(doc(db, 'users', currentUser.uid), {
              familyId: targetFamilyId
            });
            setProfile((prev) => ({ ...prev, familyId: targetFamilyId }));
          }
        }
      }

      // Subscribe in real-time to the family doc
      subscribeToFamily(targetFamilyId);
      // Subscribe in real-time to transactions
      subscribeToTransactions(targetFamilyId);
    } catch (err) {
      console.error('Error resolving family:', err);
    }
  }

  // 1. Listen for Authentication Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or listen to user profile
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setProfile(userData);
          await resolveFamilyForUser(currentUser, userData);
        } else {
          // Pre-fill name from Google display name
          setName(currentUser.displayName || '');
          setProfile(null);
        }
      } else {
        setProfile(null);
        setFamily(null);
        setFamilyMembers([]);
        setTransactions([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Listen for pending in-app invitations for the signed-in user
  useEffect(() => {
    if (!user?.email) return;
    const emailLower = user.email.toLowerCase();
    const invQ = query(
      collection(db, 'invitations'),
      where('toEmail', '==', emailLower),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(invQ, (snap) => {
      if (!snap.empty) {
        const inv = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setPendingInvitation(inv);
      } else {
        setPendingInvitation(null);
      }
    });
    return () => unsub();
  }, [user?.email]);

  // Login with Google
  const loginGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error al iniciar con Google', error);
      alert('Error al iniciar sesión con Google.');
    }
  };

  // Save Initial Profile
  const saveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);

    try {
      let avatarUrl = user.photoURL || '';

      if (imageFile) {
        const storageRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(storageRef, imageFile);
        avatarUrl = await getDownloadURL(storageRef);
      }

      const userData = {
        uid: user.uid,
        name: name || user.displayName || 'Usuario',
        email: user.email,
        color: color,
        avatar: avatarUrl,
        initial: (name || user.email || 'U')[0].toUpperCase(),
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
      setProfile(userData);
      await resolveFamilyForUser(user, userData);
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Error al guardar el perfil');
    } finally {
      setIsSavingProfile(false);
    }
  };


  const handleUpdateFamilyName = async () => {
    if (!tempFamilyName.trim() || !family) return;
    try {
      await updateDoc(doc(db, 'families', family.id), {
        name: tempFamilyName.trim()
      });
      setIsEditingFamilyName(false);
    } catch (err) {
      console.error('Error updating family name:', err);
    }
  };

  // Transaction CRUD Operations
  const handleSaveTransaction = async (txData) => {
    if (!family) return;
    const txColRef = collection(db, 'families', family.id, 'transactions');

    if (txData.id) {
      // Update
      const { id, ...updateFields } = txData;
      await updateDoc(doc(txColRef, id), {
        ...updateFields,
        updatedAt: serverTimestamp()
      });
    } else {
      // Add new
      await addDoc(txColRef, {
        ...txData,
        createdAt: serverTimestamp()
      });
    }
  };

  const handleDeleteTransaction = async (txId) => {
    if (!family || !txId) return;
    await deleteDoc(doc(db, 'families', family.id, 'transactions', txId));
  };

  // Shared Note Handlers
  const handleSaveNote = async (text) => {
    if (!family) return;
    await updateDoc(doc(db, 'families', family.id), {
      sharedNote: text,
      sharedNoteAuthorName: profile?.name || user?.displayName || 'Usuario',
      sharedNoteAuthorColor: profile?.color || '#EC4899',
      sharedNoteUpdatedAt: serverTimestamp()
    });
  };

  const handleDeleteNote = async () => {
    if (!family) return;
    await updateDoc(doc(db, 'families', family.id), {
      sharedNote: '',
      sharedNoteAuthorName: '',
      sharedNoteAuthorColor: '',
      sharedNoteUpdatedAt: serverTimestamp()
    });
  };

  // Invite Modal Handlers
  const handleInviteEmail = async (email) => {
    if (!family || !profile || !user) return;
    const emailLower = email.toLowerCase();

    // 1. Add email to invitedEmails in family doc (for auto-join on login)
    await updateDoc(doc(db, 'families', family.id), {
      invitedEmails: arrayUnion(emailLower)
    });

    // 2. Create an in-app invitation notification in /invitations
    await addDoc(collection(db, 'invitations'), {
      familyId: family.id,
      familyName: family.name || 'Finanzas Familiares',
      fromUid: user.uid,
      fromName: profile.name || user.displayName || 'Tu pareja',
      fromColor: profile.color || '#6366F1',
      fromAvatar: profile.avatar || user.photoURL || '',
      toEmail: emailLower,
      status: 'pending',
      createdAt: serverTimestamp()
    });
  };

  const handleRemoveInvitedEmail = async (email) => {
    if (!family) return;
    await updateDoc(doc(db, 'families', family.id), {
      invitedEmails: arrayRemove(email)
    });
  };

  const handleJoinWithCode = async (code) => {
    if (!user || !profile) return;
    const q = query(collection(db, 'families'), where('inviteCode', '==', code.trim()));
    const snap = await getDocs(q);

    let targetId = null;
    if (!snap.empty) {
      targetId = snap.docs[0].id;
    } else {
      const direct = await getDoc(doc(db, 'families', code.trim()));
      if (direct.exists()) targetId = direct.id;
    }

    if (!targetId) {
      throw new Error('Código no encontrado o inválido');
    }

    // Step 1: Add the user's email to invitedEmails first so rules allow the join
    // We do this via a separate write that the owner's rule allows on invitations
    // Then do the actual member join update
    try {
      await updateDoc(doc(db, 'families', targetId), {
        members: arrayUnion(user.uid),
        [`memberProfiles.${user.uid}`]: {
          name: profile.name,
          color: profile.color,
          avatar: profile.avatar || user.photoURL || '',
          email: user.email
        }
      });
    } catch (permErr) {
      // If permission denied, create a join-request invitation so the owner can see it
      if (permErr.code === 'permission-denied') {
        await addDoc(collection(db, 'invitations'), {
          familyId: targetId,
          familyName: 'Familia',
          fromUid: user.uid,
          fromName: profile.name || user.displayName || 'Usuario',
          fromColor: profile.color || '#6366F1',
          fromAvatar: profile.avatar || user.photoURL || '',
          toEmail: '', // broadcast — owner will see it
          requestingUid: user.uid,
          requestingEmail: user.email || '',
          status: 'join_request',
          inviteCode: code.trim(),
          createdAt: serverTimestamp()
        });
        throw new Error(
          'Tu solicitud fue enviada. El dueño de la familia debe aceptarte desde su app.'
        );
      }
      throw permErr;
    }

    await updateDoc(doc(db, 'users', user.uid), {
      familyId: targetId
    });

    setProfile((prev) => ({ ...prev, familyId: targetId }));
    subscribeToFamily(targetId);
    subscribeToTransactions(targetId);
  };

  // Accept an in-app invitation
  const handleAcceptInvitation = async (inviteId, targetFamilyId) => {
    if (!user || !profile) return;
    try {
      // Add user to the family
      await updateDoc(doc(db, 'families', targetFamilyId), {
        members: arrayUnion(user.uid),
        [`memberProfiles.${user.uid}`]: {
          name: profile.name,
          color: profile.color,
          avatar: profile.avatar || user.photoURL || '',
          email: user.email
        },
        ...(user.email ? { invitedEmails: arrayRemove(user.email.toLowerCase()) } : {})
      });
      // Update user profile with familyId
      await updateDoc(doc(db, 'users', user.uid), { familyId: targetFamilyId });
      // Mark invitation as accepted
      await updateDoc(doc(db, 'invitations', inviteId), { status: 'accepted' });
      setProfile((prev) => ({ ...prev, familyId: targetFamilyId }));
      setPendingInvitation(null);
      subscribeToFamily(targetFamilyId);
      subscribeToTransactions(targetFamilyId);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      alert('No se pudo aceptar la invitación. Intenta con el código o enlace directo.');
    }
  };

  // Decline an in-app invitation
  const handleDeclineInvitation = async (inviteId) => {
    try {
      await updateDoc(doc(db, 'invitations', inviteId), { status: 'declined' });
      setPendingInvitation(null);
    } catch (err) {
      console.error('Error declining invitation:', err);
    }
  };

  // Quick Open Modal
  const openNewTransaction = (type = 'expense') => {
    setEditingTransaction(null);
    setTransactionModalType(type);
    setIsTransactionModalOpen(true);
  };

  const openEditTransaction = (tx) => {
    setEditingTransaction(tx);
    setTransactionModalType(tx.type || 'expense');
    setIsTransactionModalOpen(true);
  };

  // Filtered lists for tabs
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const d = new Date(tx.date + 'T00:00:00');
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [transactions]);

  // Overall Financial Totals
  const { currentMonthIncome, currentMonthExpense, currentMonthBalance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    currentMonthTransactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') inc += amt;
      else exp += amt;
    });
    return {
      currentMonthIncome: inc,
      currentMonthExpense: exp,
      currentMonthBalance: inc - exp
    };
  }, [currentMonthTransactions]);

  // Tab specific transaction lists with filters
  const expensesList = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      if (selectedCategoryFilter !== 'all' && t.category !== selectedCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
        const matchUser = (t.userName || '').toLowerCase().includes(q);
        return matchDesc || matchCat || matchUser;
      }
      return true;
    });
  }, [transactions, selectedCategoryFilter, searchQuery]);

  const incomesList = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'income') return false;
      if (selectedCategoryFilter !== 'all' && t.category !== selectedCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
        const matchUser = (t.userName || '').toLowerCase().includes(q);
        return matchDesc || matchCat || matchUser;
      }
      return true;
    });
  }, [transactions, selectedCategoryFilter, searchQuery]);

  // Top 3 Expense Categories (for quick chips on Home)
  const topExpenseCategories = useMemo(() => {
    const map = {};
    currentMonthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'otros';
        map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
      });

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([catId, total]) => ({
        ...getCategoryById('expense', catId),
        total
      }));
  }, [currentMonthTransactions]);

  // Loading Screen
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600 font-semibold space-x-2">
        <div className="w-5 h-5 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Cargando Finanzas Familiares...</span>
      </div>
    );
  }

  // 1. Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-indigo-50/40 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center space-y-6 animate-slide-up">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-md shadow-indigo-200">
            💰
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              Finanzas Familiares
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Control transparente de ingresos, gastos y metas en tiempo real junto a tu pareja.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={loginGoogle}
              className="w-full py-3.5 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-xs font-bold text-sm text-slate-700 flex items-center justify-center space-x-3 hover:bg-slate-50 transition active:scale-98"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-4 flex items-center justify-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Sincronización instantánea en todos tus dispositivos</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Profile Setup Screen (First time login)
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <form
          onSubmit={saveProfile}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6 text-left animate-slide-up"
        >
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-slate-800">Configura tu Perfil</h2>
            <p className="text-xs text-slate-400">
              Así te identificará tu pareja en cada gasto e ingreso que registres.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <label className="cursor-pointer relative group">
              <div
                className="w-20 h-20 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 group-hover:border-indigo-500 transition shadow-xs"
                style={{ borderColor: color }}
              >
                {imageFile ? (
                  <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                ) : user.photoURL ? (
                  <img src={user.photoURL} alt="Google" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition" />
                )}
              </div>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="hidden" />
            </label>
            <span className="text-[11px] text-slate-400">Toca para cambiar foto</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tu Nombre
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. David o Angélica"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Color Distintivo
            </label>
            <div className="flex space-x-3 justify-center">
              {['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-full transition-transform ${
                    color === c ? 'scale-115 ring-2 ring-offset-2 ring-slate-800' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            {isSavingProfile ? 'Guardando...' : 'Comenzar a usar'}
          </button>
        </form>
      </div>
    );
  }

  // 3. Main Dashboard Application
  return (
    <>
      {/* In-app Invitation Banner (floating, shown when partner invites by email) */}
      {pendingInvitation && (
        <InvitationBanner
          invitation={pendingInvitation}
          onAccept={handleAcceptInvitation}
          onDecline={handleDeclineInvitation}
        />
      )}

    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col justify-between max-w-lg mx-auto shadow-2xl relative">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-200/80 sticky top-0 z-20 flex items-center justify-between">
        {/* Left: User and Family Info */}
        <div className="flex items-center space-x-3">
          {/* Avatar Stack (Couple) */}
          <div className="flex items-center -space-x-2 cursor-pointer" onClick={() => setIsInviteModalOpen(true)}>
            {familyMembers.map((m) => (
              <div
                key={m.uid}
                className="w-9 h-9 rounded-full border-2 border-white shadow-xs overflow-hidden flex items-center justify-center text-xs font-extrabold text-white"
                style={{ backgroundColor: m.color || '#3B82F6' }}
                title={m.name}
              >
                {m.avatar ? (
                  <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  (m.name || 'U')[0].toUpperCase()
                )}
              </div>
            ))}
            {familyMembers.length === 1 && (
              <div
                className="w-9 h-9 rounded-full border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold hover:bg-indigo-100 transition"
                title="Invitar a tu pareja"
              >
                +
              </div>
            )}
          </div>

          <div>
            {isEditingFamilyName ? (
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={tempFamilyName}
                  onChange={(e) => setTempFamilyName(e.target.value)}
                  className="text-xs font-bold border border-slate-300 rounded px-1.5 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                <button onClick={handleUpdateFamilyName} className="text-emerald-600 p-0.5">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center space-x-1 cursor-pointer group"
                onClick={() => {
                  setTempFamilyName(family?.name || 'Finanzas Familiares');
                  setIsEditingFamilyName(true);
                }}
              >
                <h1 className="font-extrabold text-slate-800 text-sm tracking-tight group-hover:text-indigo-600 transition">
                  {family?.name || 'Finanzas Familiares'}
                </h1>
                <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition" />
              </div>
            )}
            <p className="text-[11px] text-slate-400 flex items-center space-x-1">
              <span>{familyMembers.length > 1 ? 'Pareja conectada' : 'Solo tú (invita a tu pareja)'}</span>
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl transition flex items-center space-x-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="Invitar a mi pareja"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-bold">Invitar</span>
          </button>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-xl transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="p-4 space-y-4 flex-1 overflow-y-auto pb-24 text-left">
        {/* ==================== TAB: HOME ==================== */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-fade-in">
            {/* Balance Hero Card */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white p-6 rounded-3xl shadow-xl shadow-indigo-200/50 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-indigo-100">
                  Balance del Mes
                </span>
                <span className="text-xs text-indigo-200 font-medium">
                  {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  {formatCurrency(currentMonthBalance)}
                </h2>
                <p className="text-[11px] text-indigo-200 mt-0.5">
                  Sincronizado en vivo con tu pareja
                </p>
              </div>

              {/* Incomes & Expenses pills */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/15">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-200 uppercase font-semibold block">Ingresos</span>
                    <span className="text-sm font-extrabold text-white">
                      {formatCurrency(currentMonthIncome)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-200 uppercase font-semibold block">Gastos</span>
                    <span className="text-sm font-extrabold text-white">
                      {formatCurrency(currentMonthExpense)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Couple Invite Card */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-indigo-100/90 p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-base shadow-xs">
                  💌
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">
                    {familyMembers.length > 1 ? 'Finanzas en Pareja' : '¡Invita a tu Pareja!'}
                  </h4>
                  <p className="text-[11px] text-indigo-800/80">
                    {familyMembers.length > 1
                      ? `${familyMembers.length} personas conectadas en este hogar`
                      : 'Envía el link por WhatsApp o Email para ver y editar juntos'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center space-x-1 shrink-0"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Invitar</span>
              </button>
            </div>

            {/* Shared Note Card - Nota para la pareja */}
            <SharedNoteCard
              note={sharedNote}
              noteAuthorName={sharedNoteAuthorName}
              noteAuthorColor={sharedNoteAuthorColor}
              noteUpdatedAt={sharedNoteUpdatedAt}
              currentUser={user}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
            />

            {/* BCV Converter */}
            <BcvConverter />

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => openNewTransaction('expense')}
                className="p-3.5 bg-white border border-rose-100 rounded-2xl shadow-xs hover:border-rose-300 hover:bg-rose-50/30 transition flex items-center space-x-3 active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-800 block">+ Registrar Gasto</span>
                  <span className="text-[10px] text-slate-400">Comida, carro, etc.</span>
                </div>
              </button>

              <button
                onClick={() => openNewTransaction('income')}
                className="p-3.5 bg-white border border-emerald-100 rounded-2xl shadow-xs hover:border-emerald-300 hover:bg-emerald-50/30 transition flex items-center space-x-3 active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-800 block">+ Registrar Ingreso</span>
                  <span className="text-[10px] text-slate-400">Salario, extras, etc.</span>
                </div>
              </button>
            </div>

            {/* Top 3 Spending Categories (Quick preview) */}
            {topExpenseCategories.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                    <span>En qué más se gasta este mes</span>
                  </span>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    <span>Ver informe</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {topExpenseCategories.map((top) => (
                    <div
                      key={top.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-center space-y-0.5"
                    >
                      <span className="text-base block">{top.badge}</span>
                      <span className="text-[11px] font-bold text-slate-700 block truncate">{top.label}</span>
                      <span className="text-xs font-extrabold text-rose-600 block">
                        {formatCurrency(top.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Transactions List */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Últimos Movimientos</span>
                </h3>
                <span className="text-[11px] text-slate-400">{transactions.length} registros</span>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-xl">
                    ✨
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">¡Aún no hay movimientos registrados!</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-0.5">
                      Empieza tocando "+ Registrar Gasto" o "+ Registrar Ingreso".
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.slice(0, 10).map((tx) => {
                    const cat = getCategoryById(tx.type, tx.category);
                    const isExp = tx.type === 'expense';
                    const IconComponent = cat.icon;

                    return (
                      <div
                        key={tx.id}
                        onClick={() => openEditTransaction(tx)}
                        className="py-3 flex items-center justify-between hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cat.bgColor, color: cat.color }}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 line-clamp-1">
                              {tx.description || cat.label}
                            </p>
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span className="font-medium">{tx.date}</span>
                              <span>•</span>
                              <span
                                className="font-semibold px-1.5 py-0.2 rounded"
                                style={{
                                  backgroundColor: (tx.userColor || '#3B82F6') + '15',
                                  color: tx.userColor || '#3B82F6'
                                }}
                              >
                                {tx.userName || 'Usuario'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-xs font-extrabold ${
                              isExp ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {isExp ? '-' : '+'}
                            {formatCurrency(tx.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                            {cat.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB: GASTOS ==================== */}
        {activeTab === 'expenses' && (
          <div className="space-y-4 animate-fade-in">
            {/* Gastos Header summary */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                  Total Gastado Este Mes
                </span>
                <h2 className="text-2xl font-black text-rose-600">
                  {formatCurrency(currentMonthExpense)}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {expensesList.length} gastos listados
                </p>
              </div>

              <button
                onClick={() => openNewTransaction('expense')}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-rose-200 transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Gasto</span>
              </button>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar gasto por nombre, categoría o quién pagó..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Todos
              </button>
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryFilter(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1 ${
                    selectedCategoryFilter === c.id
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{c.badge}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            {/* Expenses List */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-2">
              {expensesList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No se encontraron gastos con los filtros aplicados.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {expensesList.map((tx) => {
                    const cat = getCategoryById('expense', tx.category);
                    const IconComponent = cat.icon;

                    return (
                      <div
                        key={tx.id}
                        onClick={() => openEditTransaction(tx)}
                        className="py-3 flex items-center justify-between hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cat.bgColor, color: cat.color }}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 line-clamp-1">
                              {tx.description || cat.label}
                            </p>
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span>{tx.date}</span>
                              <span>•</span>
                              <span
                                className="font-semibold px-1.5 py-0.2 rounded"
                                style={{
                                  backgroundColor: (tx.userColor || '#3B82F6') + '15',
                                  color: tx.userColor || '#3B82F6'
                                }}
                              >
                                {tx.userName || 'Usuario'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold text-rose-600">
                            -{formatCurrency(tx.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                            {cat.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB: INGRESOS ==================== */}
        {activeTab === 'incomes' && (
          <div className="space-y-4 animate-fade-in">
            {/* Incomes Header summary */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Total Ingresos Este Mes
                </span>
                <h2 className="text-2xl font-black text-emerald-600">
                  {formatCurrency(currentMonthIncome)}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {incomesList.length} ingresos listados
                </p>
              </div>

              <button
                onClick={() => openNewTransaction('income')}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-200 transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Ingreso</span>
              </button>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ingreso por nombre, categoría o quién lo aportó..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Todos
              </button>
              {INCOME_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryFilter(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1 ${
                    selectedCategoryFilter === c.id
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{c.badge}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            {/* Incomes List */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-2">
              {incomesList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No se encontraron ingresos con los filtros aplicados.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {incomesList.map((tx) => {
                    const cat = getCategoryById('income', tx.category);
                    const IconComponent = cat.icon;

                    return (
                      <div
                        key={tx.id}
                        onClick={() => openEditTransaction(tx)}
                        className="py-3 flex items-center justify-between hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cat.bgColor, color: cat.color }}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 line-clamp-1">
                              {tx.description || cat.label}
                            </p>
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span>{tx.date}</span>
                              <span>•</span>
                              <span
                                className="font-semibold px-1.5 py-0.2 rounded"
                                style={{
                                  backgroundColor: (tx.userColor || '#3B82F6') + '15',
                                  color: tx.userColor || '#3B82F6'
                                }}
                              >
                                {tx.userName || 'Usuario'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold text-emerald-600">
                            +{formatCurrency(tx.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                            {cat.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB: INFORMES & GRÁFICAS ==================== */}
        {activeTab === 'reports' && (
          <ReportsView
            transactions={transactions}
            members={familyMembers}
            onOpenTransactionModal={openNewTransaction}
          />
        )}
      </main>

      {/* Floating Action Button (Quick Add) */}
      <div className="fixed bottom-20 right-6 z-20">
        <button
          onClick={() => openNewTransaction('expense')}
          className="w-13 h-13 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-300 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          title="Registrar nuevo movimiento"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Sticky Navigation Bar */}
      <nav className="glass-nav py-2 px-6 flex justify-around text-xs font-semibold text-slate-400 sticky bottom-0 z-20 shadow-lg">
        <button
          onClick={() => {
            setActiveTab('home');
            setSelectedCategoryFilter('all');
            setSearchQuery('');
          }}
          className={`flex flex-col items-center space-y-1 transition ${
            activeTab === 'home' ? 'text-indigo-600 font-extrabold scale-105' : 'hover:text-slate-600'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px]">Inicio</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('expenses');
            setSelectedCategoryFilter('all');
            setSearchQuery('');
          }}
          className={`flex flex-col items-center space-y-1 transition ${
            activeTab === 'expenses' ? 'text-rose-600 font-extrabold scale-105' : 'hover:text-slate-600'
          }`}
        >
          <TrendingDown className="w-5 h-5" />
          <span className="text-[11px]">Gastos</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('incomes');
            setSelectedCategoryFilter('all');
            setSearchQuery('');
          }}
          className={`flex flex-col items-center space-y-1 transition ${
            activeTab === 'incomes' ? 'text-emerald-600 font-extrabold scale-105' : 'hover:text-slate-600'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[11px]">Ingresos</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('reports');
            setSelectedCategoryFilter('all');
            setSearchQuery('');
          }}
          className={`flex flex-col items-center space-y-1 transition ${
            activeTab === 'reports' ? 'text-indigo-600 font-extrabold scale-105' : 'hover:text-slate-600'
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span className="text-[11px]">Informes</span>
        </button>
      </nav>

      {/* Transaction Modal (New / Edit) */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        initialData={editingTransaction}
        defaultType={transactionModalType}
        members={familyMembers}
        currentUser={profile}
      />

      {/* Invite Modal (Add Wife / Manage Family) */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        family={
          family || {
            id: profile?.familyId || 'FAM-12345',
            inviteCode: profile?.familyId || 'FAM-12345',
            name: `Finanzas ${profile?.name || 'Familiares'}`,
            invitedEmails: []
          }
        }
        members={familyMembers.length > 0 ? familyMembers : (profile ? [profile] : [])}
        onInviteEmail={handleInviteEmail}
        onRemoveInvitedEmail={handleRemoveInvitedEmail}
        onJoinWithCode={handleJoinWithCode}
      />
    </div>
  );
}