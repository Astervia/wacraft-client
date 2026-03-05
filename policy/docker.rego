package main

# prohibiting latest as base image
deny contains msg if {
  input[i].Cmd == "from"
  val := split(input[i].Value[0], ":")
  count(val) > 1
  val[1] == "latest"
  msg = sprintf("Do not use the 'latest' tag in the base image: %s", [input[i].Value[0]])
}

# shouldn't run as root
warn contains msg if {
  not has_user_instruction
  msg = "Ideally, the Dockerfile should specify a 'USER' to avoid running as root"
}

has_user_instruction if {
  input[i].Cmd == "user"
}
