/**
 * V70 — Page Diagnostic (route /reglages/diagnostic)
 *
 * Visible uniquement pour is_super_admin === true.
 * Liste les 50 dernières erreurs enregistrées dans errorStore (local).
 * Sprint 15 — alternative légère Sentry, aucune dépendance externe.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { listErrors, clearErrors, type ErrorRecord } from '../../services/errorStore';

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const ErrorRow: React.FC<{ record: ErrorRecord }> = ({ record }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card" style={{ marginBottom: 8, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ft-code" style={{ fontSize: 11, color: 'var(--pt-muted)', marginBottom: 2 }}>
            {formatTs(record.timestamp)} · {record.scope}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--pt-ink)', wordBreak: 'break-word' }}>
            {record.message}
          </div>
          <div className="ft-code" style={{ fontSize: 11, color: 'var(--pt-muted)', marginTop: 2 }}>
            {record.url}
          </div>
        </div>
        {record.stack && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pt-muted)', flexShrink: 0, padding: 4 }}
            aria-label={expanded ? 'Réduire la stack' : 'Voir la stack'}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>
      {expanded && record.stack && (
        <pre
          className="ft-code"
          style={{
            marginTop: 10,
            padding: 10,
            background: 'var(--pt-bg)',
            borderRadius: 8,
            fontSize: 11,
            color: 'var(--pt-muted)',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {record.stack}
        </pre>
      )}
    </div>
  );
};

export const DiagnosticView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<ErrorRecord[]>([]);

  useEffect(() => {
    if (!user?.id) { setIsSuperAdmin(false); return; }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error: e }) => {
        if (cancelled) return;
        if (e) { setIsSuperAdmin(false); return; }
        setIsSuperAdmin(Boolean(data?.is_super_admin));
      }, () => { if (!cancelled) setIsSuperAdmin(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (isSuperAdmin === true) setErrors(listErrors());
  }, [isSuperAdmin]);

  const handleClear = useCallback(() => {
    clearErrors();
    setErrors([]);
  }, []);

  return (
    <div className="pt-screen">
      {/* Header */}
      <div className="ph ph--primary">
        <button
          type="button"
          className="ph__back"
          onClick={() => navigate('/reglages')}
          aria-label="Retour aux réglages"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="ph__title">
          <span className="ft-heading" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Diagnostic
          </span>
          <span className="ph__subtitle">Erreurs capturées en local</span>
        </div>
      </div>

      <div style={{ padding: '16px 16px 80px' }}>
        {isSuperAdmin === null && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--pt-muted)' }}>
            Vérification des droits…
          </div>
        )}

        {isSuperAdmin === false && (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <AlertTriangle size={32} style={{ color: 'var(--pt-muted)', margin: '0 auto 12px' }} />
            <div className="ft-heading" style={{ fontSize: 16, textTransform: 'uppercase' }}>
              Accès réservé
            </div>
            <div style={{ fontSize: 14, color: 'var(--pt-muted)', marginTop: 6 }}>
              Cette page est réservée aux super-administrateurs PorcTrack.
            </div>
          </div>
        )}

        {isSuperAdmin === true && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="ft-heading" style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--pt-muted)' }}>
                {errors.length} erreur{errors.length !== 1 ? 's' : ''} (max 50)
              </span>
              {errors.length > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={handleClear}
                  style={{ color: 'var(--pt-danger, #a4453d)', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Trash2 size={14} />
                  Effacer tout
                </button>
              )}
            </div>

            {errors.length === 0 ? (
              <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--pt-muted)' }}>
                Aucune erreur enregistrée.
              </div>
            ) : (
              errors.map(r => <ErrorRow key={r.id} record={r} />)
            )}
          </>
        )}
      </div>
    </div>
  );
};
