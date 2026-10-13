
import { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BriefcaseBusiness,
  Bell,
  Search,
  ArrowUpRight,
  MapPin,
  RefreshCw,
  Plus,
  X,
  LogOut,
  UserRound,
  Mail,
  Building2,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Clock3
} from 'lucide-react';
import './App.css';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`;

const emptyJobForm = {
  title: '',
  company: '',
  location: '',
  jobType: 'Internship',
  description: '',
  postedBy: ''
};

const emptyAuthForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'STUDENT'
};

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('danpss_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [authMessage, setAuthMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [activePage, setActivePage] = useState('dashboard');
  const [jobs, setJobs] = useState([]);
  const [alumni, setAlumni] = useState([]);
  const [status, setStatus] = useState('Checking backend...');
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');

  const [jobSearch, setJobSearch] = useState('');
  const [alumniSearch, setAlumniSearch] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');

  const [showJobForm, setShowJobForm] = useState(false);
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [savingJob, setSavingJob] = useState(false);
  const [jobMessage, setJobMessage] = useState('');

  async function loadData() {
    setLoadingData(true);
    setDataError('');

    try {
      const healthResponse = await fetch(`${API}/health`);
      if (!healthResponse.ok) {
        throw new Error('The backend health check failed.');
      }

      const [jobsResponse, alumniResponse] = await Promise.all([
        fetch(`${API}/jobs`),
        fetch(`${API}/alumni`)
      ]);

      if (!jobsResponse.ok) {
        throw new Error('Could not load jobs and internships.');
      }

      if (!alumniResponse.ok) {
        throw new Error('Could not load the alumni network.');
      }

      const jobsData = await jobsResponse.json();
      const alumniData = await alumniResponse.json();

      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setAlumni(Array.isArray(alumniData) ? alumniData : []);
      setStatus('Backend connected');
    } catch (error) {
      setStatus('Backend offline');
      setDataError(
        error.message ||
        'Could not connect to the backend. Make sure Spring Boot is running.'
      );
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateAuthField(event) {
    const { name, value } = event.target;
    setAuthForm(previous => ({ ...previous, [name]: value }));
  }

  async function submitAuth(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');

    try {
      const registering = authMode === 'register';
      const endpoint = registering ? '/auth/register' : '/auth/login';

      const payload = registering
        ? {
            fullName: authForm.fullName.trim(),
            email: authForm.email.trim(),
            password: authForm.password,
            role: authForm.role
          }
        : {
            email: authForm.email.trim(),
            password: authForm.password
          };

      const response = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Authentication failed (${response.status}).`
        );
      }

      const loggedInUser = {
        id: data.id,
        fullName: data.fullName,
        email: data.email,
        role: data.role
      };

      setUser(loggedInUser);
      sessionStorage.setItem('danpss_user', JSON.stringify(loggedInUser));
      setJobForm(previous => ({
        ...previous,
        postedBy: loggedInUser.fullName
      }));
      setActivePage('dashboard');

      await loadData();
    } catch (error) {
      setAuthMessage(error.message || 'Could not sign in. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    sessionStorage.removeItem('danpss_user');
    setUser(null);
    setAuthForm(emptyAuthForm);
    setAuthMode('login');
    setAuthMessage('');
    setActivePage('dashboard');
    setShowJobForm(false);
    setJobMessage('');
  }

  function updateJobField(event) {
    const { name, value } = event.target;
    setJobForm(previous => ({ ...previous, [name]: value }));
  }

  async function postJob(event) {
    event.preventDefault();

    if (user?.role !== 'ALUMNI') {
      setJobMessage('Only alumni can publish job opportunities.');
      return;
    }

    setSavingJob(true);
    setJobMessage('');

    try {
      const response = await fetch(`${API}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...jobForm,
          title: jobForm.title.trim(),
          company: jobForm.company.trim(),
          postedBy: user.fullName
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || 'The server could not publish this opportunity.'
        );
      }

      setJobMessage('Opportunity published successfully!');
      setJobForm({ ...emptyJobForm, postedBy: user.fullName });
      setShowJobForm(false);
      await loadData();
    } catch (error) {
      setJobMessage(
        `${error.message} Check that the backend is running and try again.`
      );
    } finally {
      setSavingJob(false);
    }
  }

  const visibleJobs = useMemo(() => {
    const term = jobSearch.trim().toLowerCase();

    return jobs.filter(job => {
      const searchableText = [
        job.title,
        job.company,
        job.location,
        job.description,
        job.jobType
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = searchableText.includes(term);
      const matchesType =
        jobTypeFilter === 'All' ||
        (job.jobType || 'Opportunity').toLowerCase() ===
          jobTypeFilter.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [jobs, jobSearch, jobTypeFilter]);

  const visibleAlumni = useMemo(() => {
    const term = alumniSearch.trim().toLowerCase();

    return alumni.filter(person => {
      const name = person.fullName || '';
      const email = person.email || '';

      return `${name} ${email}`.toLowerCase().includes(term);
    });
  }, [alumni, alumniSearch]);

  const notifications = useMemo(() => {
    const items = [];

    jobs.slice(0, 5).forEach(job => {
      items.push({
        id: `job-${job.id}`,
        title: 'New career opportunity',
        description: `${job.title || 'Opportunity'} at ${job.company || 'a company'}`,
        detail: job.location || 'Explore the job details',
        type: 'job'
      });
    });

    alumni.slice(0, 5).forEach(person => {
      items.push({
        id: `alumni-${person.id}`,
        title: 'Alumni in your network',
        description: person.fullName || 'New alumni member',
        detail: person.email || 'Registered alumni',
        type: 'alumni'
      });
    });

    return items;
  }, [jobs, alumni]);

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-decoration auth-decoration-one" />
        <div className="auth-decoration auth-decoration-two" />

        <section className="auth-card">
          <div className="auth-brand-icon">
            <GraduationCap size={32} />
          </div>

          <span className="eyebrow">YOUR COLLEGE CAREER NETWORK</span>
          <h1>{authMode === 'login' ? 'Welcome back!' : 'Join DANPSS'}</h1>
          <p className="auth-subtitle">
            {authMode === 'login'
              ? 'Sign in to connect with alumni and explore opportunities.'
              : 'Create an account to connect, learn and grow together.'}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === 'login' ? 'auth-tab selected' : 'auth-tab'}
              onClick={() => {
                setAuthMode('login');
                setAuthMessage('');
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'auth-tab selected' : 'auth-tab'}
              onClick={() => {
                setAuthMode('register');
                setAuthMessage('');
              }}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === 'register' && (
              <>
                <label>
                  Full name
                  <input
                    name="fullName"
                    value={authForm.fullName}
                    onChange={updateAuthField}
                    placeholder="Enter your full name"
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  I am a
                  <select
                    name="role"
                    value={authForm.role}
                    onChange={updateAuthField}
                  >
                    <option value="STUDENT">Student</option>
                    <option value="ALUMNI">Alumni</option>
                  </select>
                </label>
              </>
            )}

            <label>
              Email address
              <input
                type="email"
                name="email"
                value={authForm.email}
                onChange={updateAuthField}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                value={authForm.password}
                onChange={updateAuthField}
                placeholder={
                  authMode === 'register'
                    ? 'At least 8 characters'
                    : 'Enter your password'
                }
                minLength={authMode === 'register' ? 8 : undefined}
                autoComplete={
                  authMode === 'register' ? 'new-password' : 'current-password'
                }
                required
              />
            </label>

            {authMessage && (
              <p className="form-message auth-message" role="alert">
                {authMessage}
              </p>
            )}

            <button
              type="submit"
              className="primary auth-submit"
              disabled={authLoading}
            >
              {authLoading
                ? 'Please wait...'
                : authMode === 'login'
                  ? 'Login to DANPSS'
                  : 'Create account'}
              {!authLoading && <ArrowUpRight size={17} />}
            </button>
          </form>

          <p className="auth-switch">
            {authMode === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthMessage('');
              }}
            >
              {authMode === 'login' ? 'Register here' : 'Login here'}
            </button>
          </p>

          <div className="auth-backend-status">
            <span
              className={`dot ${
                status === 'Backend connected' ? 'online-dot' : ''
              }`}
            />
            {status}
          </div>
        </section>
      </div>
    );
  }

  function navigate(page) {
    setActivePage(page);
    setJobMessage('');
    setDataError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderJobCards() {
    if (visibleJobs.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <BriefcaseBusiness size={25} />
          </div>
          <h3>
            {jobSearch || jobTypeFilter !== 'All'
              ? 'No matching opportunities'
              : 'No opportunities posted yet'}
          </h3>
          <p>
            {jobSearch || jobTypeFilter !== 'All'
              ? 'Try changing your search or opportunity type.'
              : user.role === 'ALUMNI'
                ? 'Share your first job or internship with the college community.'
                : 'New jobs and internships will appear here when alumni publish them.'}
          </p>
          {user.role === 'ALUMNI' && (
            <button
              type="button"
              className="primary"
              onClick={() => setShowJobForm(true)}
            >
              <Plus size={17} /> Post an opportunity
            </button>
          )}
          <button
            type="button"
            className="secondary"
            onClick={loadData}
          >
            <RefreshCw size={15} /> Refresh opportunities
          </button>
        </div>
      );
    }

    return (
      <div className="job-grid">
        {visibleJobs.map((job, index) => (
          <article className="job-card" key={job.id ?? `${job.title}-${index}`}>
            <div className="job-logo">
              <BriefcaseBusiness size={21} />
            </div>
            <span className="job-type">{job.jobType || 'Opportunity'}</span>
            <h3>{job.title || 'Untitled opportunity'}</h3>
            <p className="company">
              <Building2 size={15} /> {job.company || 'Company not specified'}
            </p>
            {job.location && (
              <p className="location">
                <MapPin size={14} /> {job.location}
              </p>
            )}
            <p className="description">
              {job.description ||
                'Connect with your alumni community to learn more about this opportunity.'}
            </p>
            <div className="job-footer">
              <span>Shared by {job.postedBy || 'Community'}</span>
              <ArrowUpRight size={17} />
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <GraduationCap size={23} />
          </div>
          <div>
            <strong>DANPSS</strong>
            <small>Career network</small>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <button
          type="button"
          className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => navigate('dashboard')}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </button>

        <button
          type="button"
          className={`nav-item ${activePage === 'alumni' ? 'active' : ''}`}
          onClick={() => navigate('alumni')}
        >
          <Users size={18} />
          Alumni network
          <span className="nav-count">{alumni.length}</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activePage === 'jobs' ? 'active' : ''}`}
          onClick={() => navigate('jobs')}
        >
          <BriefcaseBusiness size={18} />
          Jobs &amp; internships
          <span className="nav-count">{jobs.length}</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activePage === 'notifications' ? 'active' : ''}`}
          onClick={() => navigate('notifications')}
        >
          <Bell size={18} />
          Notifications
          <span className="nav-count">{notifications.length}</span>
        </button>

        <div className="sidebar-bottom">
          <div className="avatar">
            {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="user-summary">
            <strong>{user.fullName}</strong>
            <small>{user.role === 'ALUMNI' ? 'Alumni' : 'Student'}</small>
          </div>
          <button
            type="button"
            className="logout-button"
            onClick={logout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">ALUMNI • STUDENTS • CAREERS</span>
            <h1>
              {activePage === 'dashboard'
                ? 'Dashboard'
                : activePage === 'alumni'
                  ? 'Alumni network'
                  : activePage === 'jobs'
                    ? 'Jobs & internships'
                    : 'Notifications'}
            </h1>
          </div>

          <div className="top-actions">
            <span
              className={`status ${
                status === 'Backend connected' ? 'online' : ''
              }`}
            >
              <span className="dot" />
              {status}
            </span>
            <button
              type="button"
              className="icon-button"
              onClick={loadData}
              title="Refresh data"
              aria-label="Refresh data"
              disabled={loadingData}
            >
              <RefreshCw size={17} />
            </button>
            <div className="avatar">
              {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {dataError && (
          <div className="form-message" role="alert">
            <AlertCircle size={17} /> {dataError}
            <button type="button" onClick={loadData}>
              Retry
            </button>
          </div>
        )}

        {activePage === 'dashboard' && (
          <>
            <section className="welcome">
              <div>
                <span className="welcome-tag">
                  YOUR NEXT CHAPTER STARTS HERE
                </span>
                <h2>
                  Connect today.
                  <br />
                  <em>Grow together.</em>
                </h2>
                <p>
                  Meet experienced alumni, discover opportunities, and build
                  your future with your college community.
                </p>
                <button
                  type="button"
                  className="primary"
                  onClick={() => navigate('jobs')}
                >
                  Explore opportunities <ArrowUpRight size={17} />
                </button>
              </div>

              <div className="welcome-art">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="art-center">
                  <GraduationCap size={52} />
                </div>
                <div className="float-card card-top">
                  <Users size={17} />
                  <span>Alumni network</span>
                </div>
                <div className="float-card card-bottom">
                  <BriefcaseBusiness size={17} />
                  <span>Career opportunities</span>
                </div>
              </div>
            </section>

            <section className="stats">
              <div className="stat-card">
                <span className="stat-icon purple">
                  <Users size={19} />
                </span>
                <span className="stat-label">Registered alumni</span>
                <strong>{alumni.length}</strong>
                <small>Explore your alumni network</small>
              </div>

              <div className="stat-card">
                <span className="stat-icon orange">
                  <BriefcaseBusiness size={19} />
                </span>
                <span className="stat-label">Open opportunities</span>
                <strong>{jobs.length}</strong>
                <small>Jobs and internships posted</small>
              </div>

              <div className="stat-card">
                <span className="stat-icon green">
                  <GraduationCap size={19} />
                </span>
                <span className="stat-label">Community updates</span>
                <strong>{notifications.length}</strong>
                <small>Recent opportunities and members</small>
              </div>
            </section>

            <section className="jobs-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">TAKE THE NEXT STEP</span>
                  <h2>Latest opportunities</h2>
                  <p>Explore jobs and internships shared with your community.</p>
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => navigate('jobs')}
                >
                  View all <ArrowUpRight size={15} />
                </button>
              </div>
              {renderJobCards()}
            </section>
          </>
        )}

        {activePage === 'alumni' && (
          <section className="jobs-section page-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">YOUR COLLEGE COMMUNITY</span>
                <h2>Meet our alumni</h2>
                <p>
                  Discover registered alumni and connect through their contact
                  information.
                </p>
              </div>
              <div className="search-box">
                <Search size={17} />
                <input
                  type="search"
                  value={alumniSearch}
                  onChange={event => setAlumniSearch(event.target.value)}
                  placeholder="Search name or email..."
                />
              </div>
            </div>

            <div className="page-summary">
              <Users size={20} />
              <span>
                <strong>{visibleAlumni.length}</strong> alumni found
              </span>
              <button
                type="button"
                className="secondary"
                onClick={loadData}
                disabled={loadingData}
              >
                <RefreshCw size={15} /> Refresh
              </button>
            </div>

            {visibleAlumni.length > 0 ? (
              <div className="job-grid alumni-grid">
                {visibleAlumni.map(person => (
                  <article className="job-card alumni-card" key={person.id}>
                    <div className="alumni-avatar">
                      {(person.fullName || 'A').charAt(0).toUpperCase()}
                    </div>
                    <span className="job-type">ALUMNI</span>
                    <h3>{person.fullName || 'Alumni member'}</h3>
                    <p className="company">
                      <Mail size={15} /> {person.email}
                    </p>
                    <div className="job-footer">
                      <span>Registered DANPSS member</span>
                      <CheckCircle2 size={17} />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <Users size={25} />
                </div>
                <h3>
                  {alumniSearch
                    ? 'No alumni match your search'
                    : 'No alumni registered yet'}
                </h3>
                <p>
                  {alumniSearch
                    ? 'Try searching with another name or email address.'
                    : 'Alumni who register with the Alumni role will appear here.'}
                </p>
                <button
                  type="button"
                  className="secondary"
                  onClick={loadData}
                >
                  <RefreshCw size={15} /> Refresh alumni
                </button>
              </div>
            )}
          </section>
        )}

        {activePage === 'jobs' && (
          <section className="jobs-section page-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">CAREER GROWTH</span>
                <h2>Jobs &amp; internships</h2>
                <p>
                  Find opportunities shared by your college community.
                </p>
              </div>
              <div className="search-box">
                <Search size={17} />
                <input
                  type="search"
                  value={jobSearch}
                  onChange={event => setJobSearch(event.target.value)}
                  placeholder="Search jobs or companies..."
                />
              </div>
            </div>

            <div className="job-actions">
              <label className="filter-label">
                Opportunity type
                <select
                  value={jobTypeFilter}
                  onChange={event => setJobTypeFilter(event.target.value)}
                >
                  <option value="All">All opportunities</option>
                  <option value="Internship">Internship</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Remote">Remote</option>
                  <option value="Contract">Contract</option>
                </select>
              </label>

              {user.role === 'ALUMNI' && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setShowJobForm(previous => !previous);
                    setJobMessage('');
                  }}
                >
                  {showJobForm ? <X size={17} /> : <Plus size={17} />}
                  {showJobForm ? 'Close form' : 'Post a job / internship'}
                </button>
              )}
            </div>

            {user.role === 'STUDENT' && (
              <p className="form-message">
                <CheckCircle2 size={17} />
                You can browse opportunities. Alumni accounts can publish new
                opportunities.
              </p>
            )}

            {jobMessage && (
              <p className="form-message" role="status">
                {jobMessage}
              </p>
            )}

            {showJobForm && user.role === 'ALUMNI' && (
              <form className="job-form" onSubmit={postJob}>
                <h3>Share an opportunity</h3>

                <label>
                  Job title *
                  <input
                    name="title"
                    value={jobForm.title}
                    onChange={updateJobField}
                    placeholder="e.g. Java Full Stack Developer"
                    maxLength={150}
                    required
                  />
                </label>

                <label>
                  Company *
                  <input
                    name="company"
                    value={jobForm.company}
                    onChange={updateJobField}
                    placeholder="e.g. ABC Technologies"
                    maxLength={150}
                    required
                  />
                </label>

                <label>
                  Location
                  <input
                    name="location"
                    value={jobForm.location}
                    onChange={updateJobField}
                    placeholder="e.g. Hyderabad or Remote"
                  />
                </label>

                <label>
                  Opportunity type
                  <select
                    name="jobType"
                    value={jobForm.jobType}
                    onChange={updateJobField}
                  >
                    <option value="Internship">Internship</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Remote">Remote</option>
                    <option value="Contract">Contract</option>
                  </select>
                </label>

                <label className="description-field">
                  Description
                  <textarea
                    name="description"
                    value={jobForm.description}
                    onChange={updateJobField}
                    rows={4}
                    placeholder="Describe the role, required skills and application details..."
                  />
                </label>

                <button
                  type="submit"
                  className="primary"
                  disabled={savingJob}
                >
                  {savingJob ? 'Publishing...' : 'Publish opportunity'}
                </button>
              </form>
            )}

            <div className="page-summary">
              <BriefcaseBusiness size={20} />
              <span>
                <strong>{visibleJobs.length}</strong> opportunities found
              </span>
            </div>

            {renderJobCards()}
          </section>
        )}

        {activePage === 'notifications' && (
          <section className="jobs-section page-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">STAY UP TO DATE</span>
                <h2>Community updates</h2>
                <p>
                  Recent job postings and alumni registrations currently
                  available in DANPSS.
                </p>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={loadData}
                disabled={loadingData}
              >
                <RefreshCw size={15} /> Refresh
              </button>
            </div>

            {notifications.length > 0 ? (
              <div className="notification-list">
                {notifications.map(item => (
                  <article className="notification-card" key={item.id}>
                    <div className={`notification-icon ${item.type}`}>
                      {item.type === 'job' ? (
                        <BriefcaseBusiness size={20} />
                      ) : (
                        <Users size={20} />
                      )}
                    </div>
                    <div className="notification-content">
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <small>{item.detail}</small>
                    </div>
                    <span className="notification-tag">
                      {item.type === 'job' ? 'Opportunity' : 'Community'}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <Bell size={25} />
                </div>
                <h3>No community updates yet</h3>
                <p>
                  New alumni registrations and published opportunities will
                  appear here.
                </p>
                <button
                  type="button"
                  className="secondary"
                  onClick={loadData}
                >
                  <RefreshCw size={15} /> Check for updates
                </button>
              </div>
            )}

            <p className="form-message">
              <Clock3 size={17} />
              These updates are generated from the current alumni and jobs
              lists. Persistent read/unread notifications require a separate
              notifications table and backend endpoint.
            </p>
          </section>
        )}

        <footer>
          Digital Alumni Networking &amp; Placement Support System
          <span> • </span>
          College project
        </footer>
      </main>
    </div>
  );
}
