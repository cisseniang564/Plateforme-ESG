import { useState } from 'react';
import { Download, Plus, Trash2, Leaf } from 'lucide-react';
import {
  Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, SegmentedControl, Select, StatCard, Table, Textarea,
} from '@/components/common';
import type { Column, Tone } from '@/components/common';
import { CHART_COLORS, PILLAR_COLORS } from '@/styles/tokens';

// Catalogue visible sur /design-system (développement uniquement).
// Sert de référence : avant de créer un bouton ou une carte, regarder ici.

interface Row { id: string; indicator: string; pillar: string; value: number; status: Tone }

const ROWS: Row[] = [
  { id: '1', indicator: 'Émissions Scope 1', pillar: 'Environnement', value: 1240.5, status: 'warning' },
  { id: '2', indicator: 'Part d’énergie renouvelable', pillar: 'Environnement', value: 62, status: 'success' },
  { id: '3', indicator: 'Taux de rotation', pillar: 'Social', value: 11.4, status: 'info' },
  { id: '4', indicator: 'Incidents de conformité', pillar: 'Gouvernance', value: 3, status: 'danger' },
];

const COLUMNS: Column<Row>[] = [
  { key: 'indicator', header: 'Indicateur', sortable: true },
  { key: 'pillar', header: 'Pilier', sortable: true },
  { key: 'value', header: 'Valeur', sortable: true, align: 'right' },
  { key: 'status', header: 'Statut', render: (v) => <Badge tone={v as Tone} dot>{String(v)}</Badge> },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [period, setPeriod] = useState('30d');

  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-10">
      <h1 className="mb-1">Design system ESGFlow</h1>
      <p className="text-gray-500 mb-10">Composants communs : à utiliser dans toutes les pages.</p>

      <Section title="Boutons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Enregistrer</Button>
          <Button variant="secondary">Annuler</Button>
          <Button variant="outline" icon={<Download className="h-4 w-4" />}>Exporter</Button>
          <Button variant="ghost">Plus tard</Button>
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />}>Supprimer</Button>
          <Button loading>Envoi…</Button>
          <Button disabled>Désactivé</Button>
          <Button iconOnly variant="secondary" aria-label="Ajouter"><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Button size="xs">XS</Button><Button size="sm">SM</Button><Button size="md">MD</Button><Button size="lg">LG</Button>
        </div>
      </Section>

      <Section title="Sélecteur de période">
        <SegmentedControl
          aria-label="Période"
          value={period}
          onChange={setPeriod}
          options={[{ value: '7d', label: '7 j' }, { value: '30d', label: '30 j' }, { value: '90d', label: '90 j' }, { value: '1y', label: '1 an' }]}
        />
      </Section>

      <Section title="Chiffres clés">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Score ESG" value="72" delta={4.2} hint="vs 2025" icon={<Leaf className="h-5 w-5" />} />
          <StatCard label="Émissions (tCO₂e)" value="1 240" delta={-8.5} lowerIsBetter hint="vs 2025" />
          <StatCard label="Complétude des données" value="86 %" delta={-1.3} hint="vs mois dernier" />
        </div>
      </Section>

      <Section title="Badges et alertes">
        <div className="flex flex-wrap gap-2 mb-5">
          {(['success', 'warning', 'danger', 'info', 'neutral', 'brand'] as Tone[]).map((t) => (
            <Badge key={t} tone={t} dot>{t}</Badge>
          ))}
        </div>
        <div className="space-y-3">
          <Alert tone="success" title="Rapport généré">Le rapport CSRD 2026 est prêt à être téléchargé.</Alert>
          <Alert tone="warning" title="Données manquantes">12 indicateurs du pilier Social n’ont pas de valeur pour 2026.</Alert>
          <Alert tone="danger" title="Import échoué" action={<Button size="sm" variant="secondary">Réessayer</Button>}>Le fichier FEC contient des lignes invalides.</Alert>
          <Alert tone="info">Les scores sont recalculés chaque nuit à 02h00.</Alert>
        </div>
      </Section>

      <Section title="Formulaire">
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nom de l’indicateur" placeholder="Ex. Émissions Scope 2" required />
            <Select label="Pilier" defaultValue="e"><option value="e">Environnement</option><option value="s">Social</option><option value="g">Gouvernance</option></Select>
            <Input label="Valeur" type="number" error="La valeur doit être positive." defaultValue={-4} />
            <Input label="Source" hint="Facture, relevé compteur, FEC…" />
            <div className="sm:col-span-2"><Textarea label="Notes" placeholder="Commentaire pour l’auditeur" /></div>
          </div>
        </Card>
      </Section>

      <Section title="Tableau (tri au clic sur l’en-tête)">
        <Table data={ROWS} columns={COLUMNS} />
        <div className="mt-4"><Table data={[]} columns={COLUMNS} emptyTitle="Aucun indicateur" emptyDescription="Ajoutez une première donnée pour voir votre score." emptyAction={<Button icon={<Plus className="h-4 w-4" />}>Ajouter une donnée</Button>} /></div>
      </Section>

      <Section title="Fenêtres">
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setModal(true)}>Ouvrir une fenêtre</Button>
          <Button variant="danger" onClick={() => setConfirm(true)}>Confirmation de suppression</Button>
        </div>
        <Modal isOpen={modal} onClose={() => setModal(false)} title="Nouvel indicateur" subtitle="Renseignez les informations de base."
          footer={<><Button variant="secondary" onClick={() => setModal(false)}>Annuler</Button><Button onClick={() => setModal(false)}>Créer</Button></>}>
          <div className="space-y-4"><Input label="Nom" /><Textarea label="Description" rows={3} /></div>
        </Modal>
        <ConfirmDialog isOpen={confirm} title="Supprimer cette donnée ?" message="« Émissions Scope 1 » sera définitivement supprimée."
          confirmLabel="Supprimer" onConfirm={() => setConfirm(false)} onClose={() => setConfirm(false)} />
      </Section>

      <Section title="Couleurs">
        <p className="text-sm text-gray-500 mb-3">Piliers ESG</p>
        <div className="flex flex-wrap gap-3 mb-5">
          {([['environmental', 'Environnement'], ['social', 'Social'], ['governance', 'Gouvernance']] as const).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="h-6 w-6 rounded-lg" style={{ background: PILLAR_COLORS[key].main }} />{label}
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mb-3">Palette des graphiques</p>
        <div className="flex gap-2">{CHART_COLORS.map((c) => <span key={c} className="h-8 w-8 rounded-lg" style={{ background: c }} title={c} />)}</div>
      </Section>
    </div>
  );
}
