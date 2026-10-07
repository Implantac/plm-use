# Project architecture decisions

- Product artwork application sends the generated garment and uploaded artwork together as ordered image-edit references, because preserving both sources is more reliable than describing either one in text.- PCP por OP: saldo por etapa e passagens só mudam pela função register_passages no banco, porque a validação de quantidade e da próxima etapa precisa ser atômica e não pode depender do cliente.

- PCP por OP: planejar (OPs, rotas, troca de rota) exige can_plan_pcp e passagens exigem can_write_pcp no banco; a tela só espelha isso via opPermissions, porque a regra de papel precisa valer mesmo fora da interface.
