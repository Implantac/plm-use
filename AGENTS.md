# Project architecture decisions

- Product artwork application sends the generated garment and uploaded artwork together as ordered image-edit references, because preserving both sources is more reliable than describing either one in text.- PCP por OP: saldo por etapa e passagens só mudam pela função register_passages no banco, porque a validação de quantidade e da próxima etapa precisa ser atômica e não pode depender do cliente.
