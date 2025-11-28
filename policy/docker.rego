package main

# prohibiting latest as base image
deny[msg] {
  input[i].Cmd == "from"
  val := split(input[i].Value[0], ":")
  count(val) > 1
  val[1] == "latest"
  msg = sprintf("Não use a tag 'latest' na imagem base: %s", [input[i].Value[0]])
}

# shouldn´t run as root
warn[msg] {
  not has_user_instruction
  msg = "O Dockerfile idealmente deve especificar um 'USER' para não rodar como root"
}

has_user_instruction {
  input[i].Cmd == "user"
}
