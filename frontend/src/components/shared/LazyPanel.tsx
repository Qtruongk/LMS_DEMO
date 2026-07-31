import { Badge, EmptyState, Panel } from './ui';

type Item = {
    id: number;
    title: string;
    content?: string;
    description?: string;
    priority?: string;
    sender_name?: string;
    created_at?: string;
    max_score?: string;
};

export default function LazyPanel({ title, items }: { title: string; items: Item[] }) {
    return (
        <Panel title={title}>
            {items.length ? <div className="grid gap-3">{items.map((item) => <article key={item.id} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">{item.priority && <Badge>{item.priority}</Badge>}<h3 className="mt-2 font-semibold first:mt-0">{item.title}</h3><p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400">{item.content ?? item.description ?? `Thang điểm ${item.max_score}`}</p></article>)}</div> : <EmptyState />}
        </Panel>
    );
}
