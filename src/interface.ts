import {
  InputNode
} from 'broccoli-node-api';
import {
  readFileSync,
  existsSync,
  lstatSync,
  statSync,
  readdirSync,
  readdir
} from 'fs';
import { entries } from 'walk-sync';

type FSMergerObject = {
  root: string;
  prefix: string | undefined;
  getDestinationPath: Function | undefined
}

type FileContent = string | Buffer | null;

type FileMeta = {
  path: string;
  prefix: string | undefined;
  getDestinationPath: Function | undefined
}

type FileMetaOption = {
  basePath: string
}
type Node = FSMergerObject | InputNode;

interface FSMerger {
  readFileSync: typeof readFileSync,
  readdirSync: typeof readdirSync,
  readdir: typeof readdir,
  at(index:number): FSMerger,
  readFileMeta(filePath: string, options: FileMetaOption): FileMeta,
  entries: typeof entries
}

interface FSMergerFileOperations extends FSMerger {
  existsSync: typeof existsSync,
  lstatSync: typeof lstatSync,
  statSync: typeof statSync,
}

export {
  FSMergerObject,
  Node,
  FSMergerFileOperations,
  FileMeta,
  FileMetaOption,
  FileContent
}
