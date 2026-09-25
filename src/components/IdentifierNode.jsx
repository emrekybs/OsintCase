import { Handle, Position } from '@xyflow/react';
import IdentifierBadge from './IdentifierBadge.jsx';
import {
  getTypeDef,
  getDisplayLabel,
  getSecondaryLabel,
} from '../identifierTypes.js';
import {
  SUBJECT_ROLES,
  THREAT_LEVELS,
  admiraltyTone,
  findOption,
} from '../caseModel.js';
import './IdentifierNode.css';
import { t } from '../i18n/index.jsx';

const SIDES = [
  { position: Position.Top, id: 'top' },
  { position: Position.Right, id: 'right' },
  { position: Position.Bottom, id: 'bottom' },
  { position: Position.Left, id: 'left' },
];

export function AdmiraltyTag({ reliability, size = 'sm' }) {
  if (!reliability || (!reliability.source && !reliability.info)) return null;
  const tone = admiraltyTone(reliability.source, reliability.info);
  const code = `${reliability.source || '?'}${reliability.info || '?'}`;
  return (
    <span
      className={`admiralty-tag tone-${tone} ${size}`}
      title={t('Kaynak güvenilirliği {0} · Bilgi doğruluğu {1}{2}', {
        '0': reliability.source || '?',
        '1': reliability.info || '?',
        '2': reliability.sourceNote ? ` · ${reliability.sourceNote}` : ''
      })}
    >
      {code}
    </span>
  );
}

export default function IdentifierNode({ data, selected }) {
  const identifier = data.identifier;
  const def = getTypeDef(identifier.type);
  const display = getDisplayLabel(identifier);
  const secondary = getSecondaryLabel(identifier);
  const isSubject = identifier.type === 'subject';
  const role = isSubject ? findOption(SUBJECT_ROLES, identifier.fields?.role) : null;
  const threat = isSubject ? findOption(THREAT_LEVELS, identifier.fields?.threat) : null;

  const cls = [
    'id-node',
    selected ? 'selected' : '',
    isSubject ? 'subject' : '',
    data.highlight === 'path' ? 'on-path' : '',
    data.highlight === 'dim' ? 'dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cls}
      style={role ? { '--role-color': role.color } : undefined}
    >
      {SIDES.map(({ position, id }) => (
        <Handle
          key={id}
          id={id}
          type="source"
          position={position}
          className="id-node-handle"
        />
      ))}
      <IdentifierBadge
        typeKey={identifier.type}
        customIconId={identifier.customIconId}
        size="md"
      />
      <div className="id-node-body">
        <div className="id-node-type">
          <span>{def.label}</span>
          <AdmiraltyTag reliability={identifier.reliability} />
        </div>
        <div className="id-node-label">{display}</div>
        {secondary && <div className="id-node-secondary">{secondary}</div>}
        {(role || threat) && (
          <div className="id-node-chips">
            {role && (
              <span className="node-chip" style={{ borderColor: role.color, color: role.color }}>
                {role.label}
              </span>
            )}
            {threat && threat.key !== 'yok' && (
              <span className="node-chip solid" style={{ background: threat.color }}>{t('Tehdit:')}{' '}{threat.label}
              </span>
            )}
          </div>
        )}
      </div>
      {data.showDegree && (
        <span className="id-node-degree" title={t('Bağlantı sayısı')}>
          {data.degree}
        </span>
      )}
    </div>
  );
}
