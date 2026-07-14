/** API de pessoas — leitura (server) e escrita (client). */
export {
  getPessoaById,
  listPessoas,
  type PessoaComRelacoes,
} from "@/lib/supabase/pessoas-server";

export {
  addRedesSociais,
  createPessoa,
  deletePessoa,
  removeFotoPessoa,
  removeRedeSocial,
  updatePessoa,
  uploadFotoPessoa,
  type PessoaInput,
  type RedeSocialInput,
} from "@/lib/supabase/pessoas";
