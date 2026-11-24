#!/usr/bin/env python3
"""Generates the LaTeX tables and appendices in ./generated and ./appendices from the
structured documentation data (stream.json).  Kept in the repository so the tables can be
regenerated when the specification changes.   Usage: python3 tools/gen_tables.py stream.json"""
import json, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
stream = json.load(open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'tools', 'stream.json')))

# ------------------------------------------------------------------ text -> LaTeX
UNI = {'\u2014': '---', '\u2013': '--', '\u2026': r'\ldots{}', '\u2192': r'$\rightarrow$', '\u2265': r'$\geq$',
       '\u2264': r'$\leq$', '\u2082': r'\textsubscript{2}', '\u2713': r'\yes{}', '\u2022': r'\textbullet{}',
       '\u00a0': '~', '\u00d7': r'$\times$', '\u2248': r'$\approx$', '\u2194': r'$\leftrightarrow$'}
SPECIAL = {'&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#', '_': r'\_\allowbreak{}', '{': r'\{', '}': r'\}',
           '~': r'\textasciitilde{}', '^': r'\textasciicircum{}', '\\': r'\textbackslash{}'}
XREF = {'(see 7.3)': r'(see \cref{sec:ai-components})', '(see 8.4)': r'(see \cref{sec:caller-trust})',
        'Super-Admin functions (2.1)': 'Super-Admin functions'}

def esc(t, code=False):
    out = []
    for ch in t:
        if ch in UNI: out.append(UNI[ch])
        elif ch in SPECIAL: out.append(SPECIAL[ch])
        elif ch == '/' : out.append(r'/\allowbreak{}')
        elif ch == '.' and code: out.append(r'.\allowbreak{}')
        else: out.append(ch)
    return ''.join(out)

def tex(s):
    s = str(s)
    for k, v in XREF.items():
        s = s.replace(k, '\x00' + str(list(XREF).index(k)) + '\x00')
    parts = re.split(r'(\*\*[^*]+\*\*|`[^`]+`|__[^_]+__)', s)
    res = []
    for p in parts:
        if p.startswith('**') and p.endswith('**') and len(p) > 4: res.append(r'\textbf{' + esc(p[2:-2]) + '}')
        elif p.startswith('`') and p.endswith('`') and len(p) > 2: res.append(r'\code{' + esc(p[1:-1], True) + '}')
        elif p.startswith('__') and p.endswith('__') and len(p) > 4: res.append(r'\emph{' + esc(p[2:-2]) + '}')
        else: res.append(esc(p))
    r = ''.join(res)
    for i, k in enumerate(XREF): r = r.replace('\x00' + str(i) + '\x00', list(XREF.values())[i])
    return r.replace('\n', r'\newline{}')

# ------------------------------------------------------------------ tables
def table(headers, rows, widths, caption=None, label=None, boldfirst=True, small=False):
    n = len(headers); tot = sum(widths)
    cols = ''.join(r'>{\raggedright\arraybackslash}p{\dimexpr(\linewidth-%d\tabcolsep)*%d/1000\relax}' % (2 * n, round(w / tot * 1000)) for w in widths)
    head = ' & '.join(r'\textcolor{white}{\sffamily\bfseries\small ' + tex(h) + '}' for h in headers)
    L = [r'{\tabfont\rowband']
    L.append(r'\begin{longtable}{@{}' + cols + r'@{}}')
    if caption:
        L.append(r'\caption{' + tex(caption) + r'}' + (r'\label{' + label + '}' if label else '') + r'\\')
    L.append(r'\rowcolor{najdanavy}' + head + r'\\')
    L.append(r'\endfirsthead')
    L.append(r'\rowcolor{najdanavy}' + head + r'\\')
    L.append(r'\endhead')
    L.append(r'\bottomrule\endlastfoot')
    for r in rows:
        cells = []
        for i, c in enumerate(r):
            t = tex(c)
            if i == 0 and boldfirst: t = r'\textbf{' + t + '}'
            cells.append(t)
        L.append(' & '.join(cells) + r'\\')
    L.append(r'\end{longtable}}')
    return '\n'.join(L) + '\n'

def write(path, text):
    p = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(text)

# collect tables by section number
sec = ''; h4 = ''; tabs = {}; order = []
pend_p = None
dd = []   # (table name, purpose, rows)
last_p = ''
for x in stream:
    k = x['k']
    if k in ('h1', 'h2'): sec = (x.get('n') or x['t'])
    elif k == 'h4': h4 = x['t']
    elif k == 'p': last_p = x['t']
    elif k == 't':
        if sec == '7.6' and x['h'][0] == 'Column':
            dd.append((h4, last_p, x['r']))
        else:
            tabs.setdefault(sec, []).append(x)
    elif k == 'uc': tabs.setdefault('uc', []).append(x['u'])

FRCOL = [1.3, 5.6, 0.95, 1.05]
fr_map = [('3.1', 'fr_iam', 'Functional requirements: identity and access management', 'tab:fr-iam'),
          ('3.2', 'fr_id', 'Functional requirements: identity verification, legal consent and medical profile', 'tab:fr-id'),
          ('3.3', 'fr_rep', 'Functional requirements: emergency reporting', 'tab:fr-rep'),
          ('3.4', 'fr_dsp', 'Functional requirements: dispatch operations', 'tab:fr-dsp'),
          ('3.5', 'fr_fld', 'Functional requirements: field response and shift management', 'tab:fr-fld'),
          ('3.6', 'fr_hos', 'Functional requirements: hospital coordination', 'tab:fr-hos'),
          ('3.7', 'fr_adm', 'Functional requirements: facility, unit and content administration', 'tab:fr-adm'),
          ('3.8', 'fr_not', 'Functional requirements: notifications', 'tab:fr-not'),
          ('3.9', 'fr_plt', 'Functional requirements: platform services', 'tab:fr-plt')]
for s, fn, cap, lab in fr_map:
    t = tabs[s][0]
    write('generated/%s.tex' % fn, table(t['h'], t['r'], FRCOL, cap, lab))
t = tabs['4'][0]; write('generated/nfr.tex', table(t['h'], t['r'], [1.65, 1.25, 5.8], 'Non-functional requirements', 'tab:nfr'))
us_map = [('5.1', 'us_iam', 'User stories: identity and access management'), ('5.2', 'us_rep', 'User stories: emergency reporting'),
          ('5.3', 'us_dsp', 'User stories: dispatch operations'), ('5.4', 'us_fld', 'User stories: field response'),
          ('5.5', 'us_hos', 'User stories: hospital coordination'), ('5.6', 'us_adm', 'User stories: administration and platform')]
for s, fn, cap in us_map:
    t = tabs[s][0]
    write('generated/%s.tex' % fn, table(t['h'], t['r'], [0.7, 1.2, 3.5, 3], cap, 'tab:' + fn.replace('_', '-')))
br_map = [('8.1', 'br_accounts', 'Business rules: accounts, roles and verification'), ('8.2', 'br_reporting', 'Business rules: reporting'),
          ('8.3', 'br_dispatch', 'Business rules: dispatch and field response'), ('8.5', 'br_hospital', 'Business rules: hospital coordination'),
          ('8.6', 'br_facilities', 'Business rules: facilities, units and content'), ('8.7', 'br_data', 'Business rules: data protection and retention')]
for s, fn, cap in br_map:
    t = tabs[s][0]
    write('generated/%s.tex' % fn, table(t['h'], t['r'], [0.75, 6, 1.4], cap, 'tab:' + fn.replace('_', '-')))
t = tabs['9.2'][0]; write('generated/tests_auto.tex', table(t['h'], t['r'], [1.5, 3.2, 2.9], 'Automated tests in the repository', 'tab:tests-auto'))
t = tabs['9.3'][0]; write('generated/tests_scenarios.tex', table(t['h'], t['r'], [0.7, 3, 2.9, 1.3], 'Verification scenarios', 'tab:tests-scenarios'))
t = tabs['10'][0]; write('generated/rtm.tex', table(t['h'], t['r'], [1.6, 1.2, 2.4, 2.4], 'Requirements traceability matrix', 'tab:rtm'))
t = tabs['12.1'][0]; write('generated/decisions.tex', table(t['h'], t['r'], [2.6, 5], 'Key design decisions and their rationale', 'tab:decisions'))
t = tabs['12.2'][0]; write('generated/future_work.tex', table(t['h'], t['r'], [2.2, 5.4], 'Planned improvements', 'tab:future-work'))
t = [v for k, v in tabs.items() if k.startswith('7.2')][0]
write('generated/modules.tex', table(t[0]['h'], t[0]['r'], [1.6, 6], 'Backend feature modules and their responsibilities', 'tab:modules'))
write('generated/jobs.tex', table(t[1]['h'], t[1]['r'], [2, 1.4, 4.2], 'Scheduled maintenance jobs', 'tab:jobs'))
t = tabs['7.3'][0]; write('generated/ai_endpoints.tex', table(t['h'], t['r'], [2.2, 0.9, 4.5], 'Endpoints of the AI model service', 'tab:ai-endpoints'))
t = tabs['7.5']; write('generated/deploy_units.tex', table(t[0]['h'], t[0]['r'], [1.4, 2.6, 3.6], 'Deployable units and their technology', 'tab:deploy-units'))
write('generated/pipelines.tex', table(t[1]['h'], t[1]['r'], [1.6, 1.8, 4.2], 'Continuous-integration pipelines', 'tab:pipelines'))
t = tabs['7.8'][0]; write('generated/incident_states.tex', table(t['h'], t['r'], [1.5, 3, 3.2], 'Incident statuses', 'tab:incident-states'))
t = tabs['7.10']; write('generated/public_endpoints.tex', table(t[0]['h'], t[0]['r'], [3.6, 4], 'Endpoints that do not require a token', 'tab:public-endpoints'))
write('generated/authz_layers.tex', table(t[1]['h'], t[1]['r'], [1.3, 3.4, 2.9], 'Authorisation layers', 'tab:authz-layers'))
t = tabs['7.11'][0]; write('generated/realtime.tex', table(t['h'], t['r'], [2.6, 2.8, 2.2], 'Real-time channels', 'tab:realtime'))
t = tabs['7.12'][0]; write('generated/notifications.tex', table(t['h'], t['r'], [2.7, 0.7, 2.5, 2.4], 'Notification types, recipients and triggers', 'tab:notifications'))
t = tabs['7.13'][0]; write('generated/security_design.tex', table(t['h'], t['r'], [1.7, 5.9], 'Security and privacy design', 'tab:security-design'))
t = tabs['7.14'][0]; write('generated/failure.tex', table(t['h'], t['r'], [1.8, 1.5, 4.3], 'Behaviour when an external dependency fails', 'tab:failure'))
t = tabs['2.1'][0]; write('generated/actors.tex', table(t['h'], t['r'], [1.3, 6], 'Human actors', 'tab:actors'))
t = tabs['2.2'][0]; write('generated/accounts.tex', table(t['h'], t['r'], [1.4, 4.2, 1.8], 'How accounts are created', 'tab:accounts'))
t = tabs['2.3'][0]; write('generated/system_actors.tex', table(t['h'], t['r'], [1.6, 5.8], 'External systems', 'tab:system-actors'))

# API appendix
api = [t for k, v in tabs.items() if k.startswith('Appendix B') or k.strip().startswith('Appendix B') for t in v]
api_titles = ['Authentication and users', 'Identity verification, legal, notifications and content', 'Incidents and evidence',
              'Units, shifts, missions and hospital transfers', 'Facilities, managers and applications']
for i, (t, ti) in enumerate(zip(api, api_titles), 1):
    write('generated/api_%d.tex' % i, table(t['h'], t['r'], [3.1, 3.4, 1.1], 'REST API: ' + ti.lower(), 'tab:api-%d' % i, boldfirst=False, ))
cfg = [t for k, v in tabs.items() if k.strip().startswith('Appendix C') for t in v][0]
write('generated/config.tex', table(cfg['h'], cfg['r'], [1.5, 6.1], 'Configuration variables (all supplied through the environment)', 'tab:config'))
glo = [t for k, v in tabs.items() if k.strip().startswith('Appendix D') for t in v][0]
write('generated/glossary.tex', table(glo['h'], glo['r'], [1.6, 6], 'Glossary of terms', 'tab:glossary'))
ts = [t for k, v in tabs.items() if k.strip().startswith('Appendix A') for t in v][0]

# ------------------------------------------------------------------ data dictionary appendix
L = []
for name, purpose, rows in dd:
    L.append(r'\subsection*{\code{%s}}' % esc(name, True))
    L.append(tex(purpose) + r'\par\vspace{2pt}')
    L.append(table(['Column', 'Type', 'Constraints and notes'], rows, [2.3, 1.5, 4.2]))
write('generated/data_dictionary.tex', '\n'.join(L))

# ------------------------------------------------------------------ use-case appendix
groups = [(1, 19, 'Account, Access and Identity'), (20, 28, 'Emergency Reporting'), (29, 37, 'Dispatch Operations'),
          (38, 42, 'Field Response and Shift Management'), (43, 47, 'Hospital Coordination'),
          (48, 57, 'Facility, Unit and Content Administration'), (58, 64, 'Notifications and General Services')]
def ucnum(u): return int(u['id'].split('-')[1])
def enum(items):
    return r'\begin{enumerate}[nosep,leftmargin=*,label=\textcolor{najdablue}{\bfseries\arabic*.}]' + '\n' + \
        '\n'.join(r'\item ' + tex(i) for i in items) + '\n' + r'\end{enumerate}'
U = []
for lo, hi, title in groups:
    U.append(r'\section{%s}' % title)
    for u in tabs['uc']:
        if not lo <= ucnum(u) <= hi: continue
        U.append(r'\Needspace{14\baselineskip}')
        U.append(r'\ucheading{%s}{%s}' % (u['id'], tex(u['name'])))
        rows = [('Actor', u['actor']), ('Platform', u['platform']), ('Preconditions', u['pre']), ('Postconditions (success)', u['post'])]
        if u.get('fail'): rows.append(('Postconditions (failure)', u['fail']))
        U.append(r'\begin{tabularx}{\linewidth}{@{}>{\columncolor{najdapale}\bfseries\small}p{3.3cm}X@{}}')
        U.append(r'\toprule')
        for k, v in rows: U.append(r'%s & %s \\ \midrule' % (tex(k), tex(v)))
        U[-1] = U[-1].replace(r'\\ \midrule', r'\\ \bottomrule')
        U.append(r'\end{tabularx}')
        U.append(r'\ucflow{Main flow}' + '\n' + enum(u['main']))
        for t, steps in u.get('alts', []):
            U.append(r'\ucflow{%s}' % tex(t.rstrip(':')) + '\n' + enum(steps))
        U.append('')
intro = r'''\chapter{Use Case Specifications}\label{app:use-cases}
This appendix specifies every use case of \ProjectName{}. The use-case diagrams are in \cref{chap:requirements};
each specification gives the actor, platform, pre- and postconditions, the main flow and the alternate or
exceptional flows. Identifiers are stable and are used by the traceability matrix (\cref{tab:rtm}).

'''
write('appendices/D_use_cases.tex', intro + '\n'.join(U))
print('generated OK:', len(os.listdir(os.path.join(ROOT, 'generated'))), 'files;', len(tabs['uc']), 'use cases;', len(dd), 'tables in dictionary')
