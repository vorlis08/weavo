import { parseCapture, type ParseResult } from './parse'
import { startOfDay } from './date'
import type { Item, Project, Space, WeavoData } from './types'

/**
 * What the #words of a capture point at: a tag of the chosen space, otherwise
 * an existing project, otherwise (the first unknown one) a project to create.
 */
export function resolveHashes(hashes: string[], space: Space, data: WeavoData) {
  const tagIds: string[] = []
  let project: Project | undefined
  let newProject: string | undefined
  for (const h of hashes) {
    const low = h.toLowerCase()
    const tag = Object.values(data.tags).find((tg) => tg.space === space && tg.name.toLowerCase() === low)
    if (tag) {
      if (!tagIds.includes(tag.id)) tagIds.push(tag.id)
      continue
    }
    const p = Object.values(data.projects).find((x) => x.name.toLowerCase() === low)
    if (p && !project) project = p
    else if (!p && !project && !newProject) newProject = h
  }
  return { tagIds, project, newProject }
}

/**
 * A task from one line of text, for the inline adders (to-do, project phases).
 * Unknown #words are dropped here — only the full capture dialog
 * creates projects.
 */
export function taskFromLine(
  text: string,
  space: Space,
  data: WeavoData,
  extra: Omit<Partial<Item>, 'kind'> = {},
): (Partial<Item> & { kind: 'task'; title: string }) | null {
  const parsed: ParseResult = parseCapture(text)
  if (!parsed.title.trim()) return null
  const chosen = parsed.space ?? space
  const { tagIds, project } = resolveHashes(parsed.hashes, chosen, data)
  return {
    kind: 'task',
    status: 'todo',
    title: parsed.title,
    space: chosen,
    tags: tagIds,
    projectId: project?.id,
    flame: parsed.flame || undefined,
    due: parsed.when?.start.toISOString() ?? (parsed.repeat ? startOfDay(new Date()).toISOString() : undefined),
    repeat: parsed.repeat,
    ...extra,
  }
}
