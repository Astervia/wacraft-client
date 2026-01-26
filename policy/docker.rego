package main

# prohibiting latest as base image
deny[msg] {
  input[i].Cmd == "from"
  val := split(input[i].Value[0], ":")
  count(val) > 1
  val[1] == "latest"
  msg = sprintf("Do not use the 'latest' tag in the base image: %s", [input[i].Value[0]])
}

# shouldn´t run as root
warn[msg] {
  not has_user_instruction
  msg = "Ideally, the Dockerfile should specify a 'USER' to avoid running as root"
}

has_user_instruction {
  input[i].Cmd == "user"
}
